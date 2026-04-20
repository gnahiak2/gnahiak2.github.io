// Smooth scroll for CTA button
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("cta");

  btn.addEventListener("click", () => {
    document.getElementById("projects").scrollIntoView({
      behavior: "smooth"
    });
  });
});