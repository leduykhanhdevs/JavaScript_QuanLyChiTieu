function responseFilename(response, fallback) {
  const header = response.headers.get('content-disposition') || '';
  const encoded = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
  const quoted = header.match(/filename\s*=\s*"([^"]+)"/i)?.[1];
  let name = fallback;
  try {
    if (encoded) name = decodeURIComponent(encoded.trim());
    else if (quoted) name = quoted;
  } catch {}
  return String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 140) || fallback;
}

export async function downloadExport(path, params, fallbackName) {
  const query = new URLSearchParams(params);
  let response;
  try {
    response = await fetch(`${path}?${query.toString()}`, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/pdf, application/json' }
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.');
  }

  if (!response.ok) {
    let message = 'Chưa xuất được tệp. Thử lại sau.';
    try {
      const payload = await response.json();
      message = payload.error?.message || message;
    } catch {}
    throw new Error(message);
  }

  const blob = await response.blob();
  const filename = responseFilename(response, fallbackName);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
  return filename;
}
