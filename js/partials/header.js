document.getElementById('app-logo').addEventListener('click', () => {
    window.location.href = '/';
  });
  
  // Hàm toggle hiển thị/ẩn menu mobile
  function toggleMobileMenu() {
    const menu = document.getElementById('header-button-container');
    menu.classList.toggle('active');
  }
  
  document.getElementById('mobile-menu-toggle').addEventListener('click', toggleMobileMenu);
  document.getElementById('close-menu').addEventListener('click', toggleMobileMenu);
  
  // Thay đổi background header và fill của svg khi scroll
  window.addEventListener('scroll', function () {
    const header = document.getElementById('header');
    const svgIcon = document.querySelector('.mobile-menu-button svg');
    const headerLinks = document.querySelectorAll('#header-button-container a');
  
    if (window.scrollY > 10) {
      header.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      if (svgIcon) {
        svgIcon.style.fill = '#fff';
      }
      headerLinks.forEach(link => {
        link.style.color = '#fff';
      });
    } else {
      header.style.backgroundColor = 'transparent';
      if (svgIcon) {
        svgIcon.style.fill = '#333';
      }
      headerLinks.forEach(link => {
        link.style.color = '#333';
      });
    }
  });