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
  message.classList.remove('hidden');
  showMessage('Sedang memproses URL...');
  button.disabled = true;
  button.textContent = 'Processing...';

  try {
    const response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input.value.trim() })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Ekstraksi gagal.');

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
    title.textContent = data.title;
    preview.append(title);
    result.append(preview);

    data.downloads.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'option';

      const info = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = item.quality || `Pilihan ${index + 1}`;
      const type = document.createElement('small');
      type.textContent = ` ${item.type || 'file'} ${item.size ? '· ' + item.size : ''}`;
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
    showMessage(`Berhasil. ${data.downloads.length} pilihan ditemukan.`);
  } catch (error) {
    showMessage(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Process URL';
  }
});
