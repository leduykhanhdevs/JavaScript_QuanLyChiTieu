if (window.location.protocol === 'file:') {
  document.querySelector('script[type="module"][src*="/js/app.js"]')?.remove();
  document.documentElement.lang = 'vi';
  document.body.innerHTML = `
    <main style="box-sizing:border-box;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f3f7ff;color:#14213d;font:16px/1.6 system-ui,sans-serif">
      <section style="box-sizing:border-box;width:min(100%,560px);padding:32px;border:1px solid #dbe5f5;border-radius:20px;background:#fff;box-shadow:0 16px 48px #173b721c">
        <p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:.08em">VÍ MÌNH</p>
        <h1 style="margin:0 0 12px;font-size:26px">Đây là file mã nguồn</h1>
        <p style="margin:0 0 22px;color:#64748b">Trang này được mở bằng <code>file:///</code>, nên đăng nhập và OTP không thể kết nối với máy chủ. Hãy mở bản local đang chạy:</p>
        <a href="http://localhost:3000/" style="display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:0 20px;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;text-decoration:none">Mở Ví Mình tại localhost:3000</a>
      </section>
    </main>`;
}
