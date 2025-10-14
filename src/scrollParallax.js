window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  document.body.style.setProperty('--scroll-offset', (scrolled * 0.3) + 'px');
});
