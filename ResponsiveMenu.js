
document.addEventListener("DOMContentLoaded", function() {
    const hamburger = document.createElement("div");
    hamburger.className = "hamburger";
    hamburger.innerHTML = "<span></span><span></span><span></span>";
    
    const navLinks = document.querySelector(".nav-links");
    const toggleTheme = document.getElementById("toggleTheme");
    const header = document.querySelector("header");
    
    if (header && navLinks) {
        
        function handleResize() {
            if (window.innerWidth <= 950) {
                if (toggleTheme && toggleTheme.parentElement !== navLinks) {
                    navLinks.appendChild(toggleTheme);
                    toggleTheme.classList.add("theme-btn-mobile");
                }
            } else {
                if (toggleTheme && toggleTheme.parentElement === navLinks) {
                    header.appendChild(toggleTheme);
                    toggleTheme.classList.remove("theme-btn-mobile");
                }
            }
        }
        
        window.addEventListener("resize", handleResize);
        handleResize(); // disparar al cargar
        
        header.appendChild(hamburger);
        
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navLinks.classList.toggle("active");
        });
    }
});
