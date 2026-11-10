
const form = document.querySelector('#form');
const input = document.querySelector('#url');
const button = document.querySelector('#submit');
const message = document.querySelector('#message');
const result = document.querySelector('#result');

function showMessage(text) {
  message.textContent = text;
  message.classList.remove('hidden');
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  result.classList.add('hidden');
  showMessage('Sedang memproses URL...');

  button.disabled = true;
  button.textContent = 'Processing...';

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        url: input.value.trim()
      })
    });

    // Baca sebagai teks terlebih dahulu
    const responseText = await response.text();

    // Pastikan respons benar-benar JSON
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Respons API bukan JSON:', responseText);

      throw new Error(
        `Server mengirim respons bukan JSON. HTTP ${response.status}. Periksa API Vercel.`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error || `Ekstraksi gagal. HTTP ${response.status}`
      );
    }

    if (!Array.isArray(data.downloads)) {
      throw new Error('Format respons API tidak valid: downloads tidak ditemukan.');
    }

    result.replaceChildren();

    const preview = document.createElement('div');
    preview.className = 'preview';

    if (data.thumbnail) {
      const img = document.createElement('img');
      img.src = data.thumbnail;
      img.alt = 'Thumbnail';
      img.referrerPolicy = 'no-referrer';
      preview.append(img);
    }

    const title = document.createElement('h2');
    title.textContent = data.title || 'Media ditemukan';
    preview.append(title);

    result.append(preview);

    data.downloads.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'option';

      const info = document.createElement('div');

      const name = document.createElement('strong');
      name.textContent = item.quality || `Pilihan ${index + 1}`;

      const type = document.createElement('small');
      type.textContent =
        ` ${item.type || 'file'} ${item.size ? '· ' + item.size : ''}`;

      info.append(name, document.createElement('br'), type);

      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Download';

      row.append(info, link);
      result.append(row);
    });

    result.classList.remove('hidden');

    showMessage(
      `Berhasil. ${data.downloads.length} pilihan ditemukan.`
    );

  } catch (error) {
    console.error('Extraction error:', error);
    showMessage(error.message || 'Terjadi kesalahan.');
  } finally {
    button.disabled = false;
    button.textContent = 'Process URL';
  }
});
