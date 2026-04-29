module.exports = {
  content: [
    './public/**/*.html',
    './public/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      colors: {
        ink: '#081221',
        canvas: '#f5f7fb',
        ember: '#f97316',
        tide: '#0f4c81',
        mist: '#d7e1ec',
      },
    },
  },
};
