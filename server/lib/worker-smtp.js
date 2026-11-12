import { connect } from 'cloudflare:sockets';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SMTP_TIMEOUT_MS = 15_000;

function smtpError(code, responseCode = null) {
  const error = new Error('SMTP operation failed.');
  error.code = code;
  error.responseCode = responseCode;
  return error;
}

function withTimeout(promise, code) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(smtpError(code)), SMTP_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function safeAddress(value) {
  const address = String(value || '').trim();
  if (!address || /[\r\n<>\s]/.test(address) || !/^[^@]+@[^@]+\.[^@]+$/.test(address)) {
    throw smtpError('SMTP_INVALID_ADDRESS');
  }
  return address;
}

function encodeHeader(value) {
  const bytes = encoder.encode(String(value || ''));
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

function base64Lines(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const encoded = btoa(binary);
  return encoded.match(/.{1,76}/g)?.join('\r\n') || '';
}

function formatMimeMessage(message, sender, recipients) {
  const boundary = `vm_${crypto.randomUUID().replaceAll('-', '')}`;
  const senderName = encodeHeader(message.from?.name || 'Ví Mình');
  const subject = encodeHeader(message.subject || 'Thông báo Ví Mình');
  const lines = [
    `From: ${senderName} <${sender}>`,
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@vi-minh.local>`,
    'MIME-Version: 1.0'
  ];

  const attachments = message.attachments || [];
  const alternativeBoundary = `${boundary}_alt`;
  const relatedBoundary = `${boundary}_related`;
  if (attachments.length) {
    lines.push(`Content-Type: multipart/related; boundary="${relatedBoundary}"`, '');
    lines.push(`--${relatedBoundary}`, `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`, '');
  } else {
    lines.push(`Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`, '');
  }

  lines.push(
    `--${alternativeBoundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    base64Lines(message.text || '')
  );
  if (message.html) {
    lines.push(
      `--${alternativeBoundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(message.html)
    );
  }
  lines.push(`--${alternativeBoundary}--`);

  for (const attachment of attachments) {
    const content = attachment.content;
    if (content == null) throw smtpError('SMTP_ATTACHMENT_UNAVAILABLE');
    const bytes = typeof content === 'string' ? encoder.encode(content) : content;
    const filename = String(attachment.filename || 'attachment').replace(/[\r\n"\\]/g, '_');
    lines.push(
      `--${relatedBoundary}`,
      `Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${filename}"`,
      `Content-Disposition: ${attachment.contentDisposition || 'attachment'}; filename="${filename}"`,
      `Content-Transfer-Encoding: base64`,
      ...(attachment.cid ? [`Content-ID: <${String(attachment.cid).replace(/[<>\r\n]/g, '')}>`] : []),
      '',
      base64Lines(bytes)
    );
  }
  if (attachments.length) lines.push(`--${relatedBoundary}--`);
  return `${lines.join('\r\n')}\r\n`;
}

class SmtpConnection {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.pending = new Uint8Array();
  }

  async readLine() {
    while (true) {
      for (let index = 0; index < this.pending.length - 1; index += 1) {
        if (this.pending[index] === 13 && this.pending[index + 1] === 10) {
          const line = this.pending.subarray(0, index);
          this.pending = this.pending.subarray(index + 2);
          return decoder.decode(line);
        }
      }
      const { value, done } = await withTimeout(this.reader.read(), 'SMTP_READ_TIMEOUT');
      if (done) throw smtpError('SMTP_CONNECTION_CLOSED');
      const combined = new Uint8Array(this.pending.length + value.length);
      combined.set(this.pending);
      combined.set(value, this.pending.length);
      this.pending = combined;
    }
  }

  async response(expectedCodes) {
    const lines = [];
    let responseCode = null;
    while (true) {
      const line = await this.readLine();
      const match = /^(\d{3})([ -])/.exec(line);
      if (!match) throw smtpError('SMTP_INVALID_RESPONSE');
      const code = Number(match[1]);
      if (responseCode === null) responseCode = code;
      if (code !== responseCode) throw smtpError('SMTP_INVALID_RESPONSE', code);
      lines.push(line);
      if (match[2] === ' ') break;
    }
    if (!expectedCodes.includes(responseCode)) throw smtpError('SMTP_REJECTED', responseCode);
    return { code: responseCode, lines };
  }

  async command(value, expectedCodes) {
    await withTimeout(this.writer.write(encoder.encode(`${value}\r\n`)), 'SMTP_WRITE_TIMEOUT');
    return this.response(expectedCodes);
  }

  async upgradeToTls() {
    if (this.pending.length) throw smtpError('SMTP_UNEXPECTED_BUFFERED_DATA');
    this.reader.releaseLock();
    this.writer.releaseLock();
    this.socket = this.socket.startTls();
    await withTimeout(this.socket.opened, 'SMTP_TLS_TIMEOUT');
    this.reader = this.socket.readable.getReader();
    this.writer = this.socket.writable.getWriter();
  }

  async close() {
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { await this.socket.close(); } catch {}
  }
}

export async function sendWorkerSmtpMessage(message, smtp) {
  const sender = safeAddress(message.from?.address || smtp.fromEmail);
  const rawRecipients = Array.isArray(message.to) ? message.to : [message.to];
  const recipients = rawRecipients.map((recipient) => safeAddress(typeof recipient === 'string' ? recipient : recipient?.address));
  if (!recipients.length) throw smtpError('SMTP_NO_RECIPIENT');

  const secure = Boolean(smtp.secure);
  const port = Number(smtp.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw smtpError('SMTP_INVALID_PORT');
  let socket;
  try {
    socket = connect({ hostname: smtp.host, port }, { secureTransport: secure ? 'on' : 'starttls' });
    await withTimeout(socket.opened, 'SMTP_CONNECT_TIMEOUT');
    const connection = new SmtpConnection(socket);
    try {
      await connection.response([220]);
      const helloName = new URL(smtp.appBaseUrl || 'https://vi-minh.local').hostname || 'vi-minh.local';
      const capabilities = await connection.command(`EHLO ${helloName}`, [250]);
      if (!secure) {
        const supportsStartTls = capabilities.lines.some((line) => /\bSTARTTLS\b/i.test(line.slice(4)));
        if (!supportsStartTls) throw smtpError('SMTP_STARTTLS_UNAVAILABLE');
        await connection.command('STARTTLS', [220]);
        await connection.upgradeToTls();
        await connection.command(`EHLO ${helloName}`, [250]);
      }

      const auth = btoa(`\u0000${smtp.user}\u0000${smtp.password}`);
      await connection.command(`AUTH PLAIN ${auth}`, [235]);
      await connection.command(`MAIL FROM:<${sender}>`, [250]);
      for (const recipient of recipients) await connection.command(`RCPT TO:<${recipient}>`, [250, 251]);
      await connection.command('DATA', [354]);

      const data = formatMimeMessage(message, sender, recipients)
        .split('\r\n')
        .map((line) => line.startsWith('.') ? `.${line}` : line)
        .join('\r\n');
      await withTimeout(connection.writer.write(encoder.encode(`${data}.\r\n`)), 'SMTP_WRITE_TIMEOUT');
      await connection.response([250]);
      try { await connection.command('QUIT', [221]); } catch {}
      return { accepted: recipients, rejected: [], messageId: null };
    } finally {
      await connection.close();
    }
  } catch (error) {
    try { await socket?.close(); } catch {}
    if (error?.code) throw error;
    throw smtpError('SMTP_CONNECTION_FAILED');
  }
}
