const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors()); // allows all origins (safe for local dev)
app.use(bodyParser.json());

const KB = [
  { keys: ['hampi'], year: 'c. 14th–16th century (≈ 600 years)', category: 'Vijayanagara / Historical', summary: 'Hampi was the capital of the Vijayanagara Empire — a vast group of ruined monuments...' },
  { keys: ['pattadakal'], year: 'c. 7th–8th century (≈ 1200 years)', category: 'Chalukya / UNESCO World Heritage', summary: 'Pattadakal is a UNESCO site combining Dravidian and Nagara architectural styles...' },
  { keys: ['belur','chennakesava'], year: 'c. 12th–13th century (≈ 900 years)', category: 'Hoysala', summary: 'Belur Chennakesava Temple is a masterpiece of Hoysala architecture...' },
  { keys: ['halebidu','hoysaleshwara'], year: 'c. 12th–13th century (≈ 900 years)', category: 'Hoysala', summary: 'Halebidu, once the Hoysala capital, contains the Hoysaleshwara temple complex...' },
  { keys: ['badami'], year: 'c. 6th–8th century (≈ 1400 years)', category: 'Early Chalukya', summary: 'Badami is famed for rock-cut cave temples carved into sandstone cliffs...' },
  { keys: ['aihole'], year: 'c. 5th–8th century (≈ 1500 years)', category: 'Chalukya / Temple cradle', summary: 'Aihole has over a hundred temples showing early experimentation in style...' },
  { keys: ['somanathapura','kesava'], year: 'c. 13th–14th century (≈ 750 years)', category: 'Hoysala', summary: 'Somanathapura (Keshava Temple) is a compact Hoysala temple famous for crisp sculptures...' },
  { keys: ['shravanabelagola'], year: 'c. 10th–11th century (prominent 1000 years)', category: 'Jain Heritage', summary: 'Shravanabelagola is an important Jain pilgrimage site, famous for the monolithic statue of Bahubali...' },
  { keys: ['banavasi'], year: 'c. 3rd–4th century (≈ 1700+ years)', category: 'Kadamba / Ancient', summary: 'Banavasi was an early Kadamba kingdom capital with a long history of temple-building...' }
];

function clientAnalyze(text='') {
  const t = (text || '').toLowerCase();
  for (const item of KB) {
    for (const k of item.keys) {
      if (t.includes(k)) return { year: item.year, summary: item.summary, category: item.category };
    }
  }
  const yearMatch = text.match(/(\d{2,4})\s*years?/i);
  if (yearMatch) return { year: `${yearMatch[1]} years (approx.)`, summary: `This place is roughly ${yearMatch[1]} years old.`, category: 'Historical' };
  return { year: 'Unknown', summary: "I don't have a direct match in the KB. Paste a place name or fuller description.", category: 'Historical / Unknown' };
}

app.post('/analyze', async (req, res) => {
  try {
    const { text = '' } = req.body || {};
    // If you want to integrate a real model here (OpenAI, etc.), do it in this block.
    // For now, return clientAnalyze result (robust offline fallback).
    const result = clientAnalyze(text);
    return res.json(result);
  } catch (err) {
    console.error('analyze error', err);
    return res.status(500).json({ year: 'Unknown', summary: 'Server error', category: 'Error' });
  }
});

// health
app.get('/_health', (req,res) => res.send({ok:true}));

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`WanderSmart backend listening on http://localhost:${port}`));
