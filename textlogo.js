// Define an array of beautiful gradient color pairs
const gradients = [
  ['#FF6B6B', '#4ECDC4'],
  ['#45B7D1', '#FFA07A'],
  ['#98D8C8', '#F06292'],
  ['#AED581', '#7986CB'],
  ['#4DB6AC', '#FFD54F'],
  ['#FF9A8B', '#FF6A88'],
  ['#FFA8A8', '#FCFF00'],
  ['#FF3CAC', '#784BA0'],
  ['#00C9FF', '#92FE9D'],
  ['#FC466B', '#3F5EFB']
];

// Function to generate a random gradient from the array
function getRandomGradient() {
  return gradients[Math.floor(Math.random() * gradients.length)];
}

// Function to generate the logo
async function generateLogo(text) {
  const canvas = new OffscreenCanvas(512, 512);
  const ctx = canvas.getContext('2d');

  // Set gradient background
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  const [color1, color2] = getRandomGradient();
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add subtle pattern
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 512; i += 20) {
    for (let j = 0; j < 512; j += 20) {
      ctx.beginPath();
      ctx.arc(i, j, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Set text properties
  ctx.fillStyle = 'white';
  ctx.font = 'bold 250px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add text shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 5;

  // Draw main text
  ctx.fillText(text.toUpperCase(), 256, 256);

  // Add a subtle inner glow
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(text.toUpperCase(), 256, 256);

  // Reset shadow
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Add a circular frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.stroke();

  // Convert canvas to blob
  return await canvas.convertToBlob();
}

// Function to send photo to Telegram
async function sendPhoto(chatId, photo) {
  const formData = new FormData();
  formData.append('chat_id', chatId);
  formData.append('photo', photo, 'logo.png');

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    body: formData
  });

  return response.json();
}

// Main handler function
async function handleRequest(request) {
  if (request.method !== 'POST') {
    return new Response('Send a POST request to this endpoint.', { status: 405 });
  }

  const payload = await request.json();

  if (!payload.message || !payload.message.text) {
    return new Response('No message text found.', { status: 400 });
  }

  const chatId = payload.message.chat.id;
  const text = payload.message.text.trim().slice(0, 2);

  if (text.length === 0) {
    await sendMessage(chatId, 'Please send 1-2 letters to generate a beautiful logo.');
    return new Response('OK');
  }

  const logo = await generateLogo(text);
  await sendPhoto(chatId, logo);

  return new Response('OK');
}

// Function to send a text message
async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });
}

// Event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Replace 'YOUR_BOT_TOKEN' with your actual bot token
const BOT_TOKEN = 'YOUR_BOT_TOKEN';
