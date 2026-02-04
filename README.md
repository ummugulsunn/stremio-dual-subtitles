# Stremio Dual Subtitles Addon

A Stremio addon that displays **two subtitle languages simultaneously** - perfect for language learners! Watch your favorite movies and series with both the original language and your native language subtitles.

![Language Learning](https://img.shields.io/badge/Language-Learning-blue)
![Stremio](https://img.shields.io/badge/Stremio-Addon-purple)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Live Demo

**[https://stremio-dual-subtitles.vercel.app](https://stremio-dual-subtitles.vercel.app)**

Click the link to configure and install the addon instantly!

## ✨ Features

- **Dual Subtitles**: See two languages at once - primary on top, secondary below
- **70+ Languages**: Support for all major languages from OpenSubtitles
- **Smart Merging**: Intelligent time-based subtitle synchronization
- **Auto-Detection**: Automatically detects your browser language
- **Modern UI**: Beautiful animated landing page with smooth interactions
- **Analytics Dashboard**: Real-time usage statistics at `/stats`
- **In-Memory Caching**: Fast subtitle delivery with 6-hour cache
- **Multiple Encodings**: Handles UTF-8, UTF-16, legacy codepages, and more
- **Gzip Compression**: Optimized response sizes for faster loading
- **Privacy Focused**: No personal data collection, open source
- **Free & Open Source**: No API keys required, completely free to use

## 📸 How It Looks

![Dual Subtitles Demo](public/demo.png)

*English on top, Turkish translation below in italics - watch and learn simultaneously!*

The primary language appears normally, while the secondary language appears in italics below.

## 🚀 Quick Start

### Option 1: Use Public Instance (Recommended)

1. Visit **[https://stremio-dual-subtitles.vercel.app](https://stremio-dual-subtitles.vercel.app)**
2. Select your primary language (the one you're learning)
3. Select your secondary language (your native language)
4. Click "Install Addon"
5. Open Stremio and enjoy dual subtitles!

### Option 2: Run Locally

**Prerequisites:**
- [Node.js](https://nodejs.org/) v16 or higher
- [Stremio](https://www.stremio.com/) installed on your device

**Installation:**

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ummugulsunn/stremio-dual-subtitles.git
   cd stremio-dual-subtitles
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Configure the addon:**
   - Open your browser and go to `http://localhost:7000/configure`
   - Select your languages and click "Install Addon"

### Option 3: Deploy Your Own

Deploy to Vercel for free:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ummugulsunn/stremio-dual-subtitles)

Or manually:
```bash
npm i -g vercel
vercel
```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7000` | Server port |
| `HOST` | `0.0.0.0` | Host to bind to |
| `EXTERNAL_URL` | auto | External URL for remote access |
| `ADDON_NAME` | `Dual Subtitles` | Custom addon name |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window per IP |
| `RATE_LIMIT_MAX` | `60` | Max requests per IP in window |
| `DEBUG_MODE` | `false` | Server debug logging |
| `NEXT_PUBLIC_DEBUG_MODE` | `false` | Debug logging toggle |

### Remote Access

To use on other devices in your network:

1. Find your computer's IP address (e.g., `192.168.1.100`)
2. Set `EXTERNAL_URL=http://192.168.1.100:7000` in `.env`
3. Open `http://192.168.1.100:7000/configure` on your other device

## 🎯 Usage Tips

### For Language Learning

1. **Choose wisely**: Set the language you're learning as PRIMARY (top)
2. **Reading practice**: Try to read the primary subtitle first
3. **Check understanding**: Glance at the secondary subtitle when needed
4. **Repeat**: Pause and repeat difficult scenes

### Best Content for Learning

- **TV Series**: Consistent dialogue, recurring vocabulary
- **Animated films**: Clear pronunciation, slower speech
- **Rom-coms**: Everyday conversational language
- **Documentaries**: Formal/educational vocabulary

## 🏗️ Project Structure

```
stremio-dual-subtitles/
├── addon.js           # Main addon logic (fetching, merging)
├── server.js          # Express server and routing
├── encoding.js        # Character encoding detection
├── languages.js       # Language maps and utilities
├── landingTemplate.js # Landing page HTML template
├── lib/
│   ├── analytics.js   # Usage tracking system
│   ├── debug.js       # Logging utilities
│   └── templates.js   # HTML templates (stats, privacy, errors)
├── public/
│   └── logo.png       # Addon logo
├── .github/
│   └── workflows/
│       └── ci.yml     # GitHub Actions CI/CD
├── package.json       # Dependencies
├── vercel.json        # Vercel deployment config
├── CHANGELOG.md       # Version history
├── .env.example       # Environment variables template
└── README.md          # This file
```

## 🔧 Technical Details

### Subtitle Sources

- **OpenSubtitles**: Primary source via Stremio's proxy API
- Subtitles are fetched, decoded, and merged in real-time

### Encoding Support

The addon handles various encodings including:
- UTF-8, UTF-16 LE/BE (with BOM detection)
- Windows codepages (1250-1258)
- ISO-8859 variants
- Double-encoded UTF-8 text

### Caching

- Merged subtitles are cached in memory for 6 hours
- No external storage required
- Cache is cleared on server restart

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- Inspired by [Strelingo Addon](https://github.com/Serkali-sudo/strelingo-addon)
- Subtitles provided by [OpenSubtitles](https://www.opensubtitles.org/)
- Built with [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)

## 🐛 Troubleshooting

### Subtitles not showing?

1. Make sure both languages are available for that movie/series
2. Try a different movie - not all content has subtitles
3. Check the server console for error messages

### Wrong encoding/garbled text?

The addon tries to auto-detect encoding, but some rare files may have issues. 
Please report these with the movie/series title.

### Can't connect from other devices?

1. Check your firewall settings
2. Ensure `EXTERNAL_URL` is set correctly
3. Use your local IP address, not `localhost`

---

**Happy learning! 🎬📚**
