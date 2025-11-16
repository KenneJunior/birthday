document.addEventListener("DOMContentLoaded", () => {
  const interBubble = document.querySelector(".interactive");
  const card = document.getElementById("proposalCard");
  const cursor_follower = document.querySelector(".cursor-follower");
  const nopeBtn = document.getElementById("nope-btn");
  const yesBtn = document.getElementById("yes-btn");
  const maybeBtn = document.getElementById("maybe-btn");

  let curX = 0;
  let curY = 0;
  let tgX = 0;
  let tgY = 0;

  const move = () => {
    curX += (tgX - curX) / 20;
    curY += (tgY - curY) / 20;
    interBubble.style.transform = `translate(${Math.round(
      curX
    )}px, ${Math.round(curY)}px)`;
    requestAnimationFrame(move);
  };

  window.addEventListener("mousemove", (event) => {
    tgX = event.clientX;
    tgY = event.clientY;

    const hue = Math.round((tgX / window.innerWidth) * 360);
    interBubble.style.background = `radial-gradient(circle, hsla(${hue}, 80%, 65%, 0.8) 0%, hsla(${hue}, 80%, 65%, 0) 60%)`;
    cursor_follower.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    const xTilt = (event.clientX / window.innerWidth - 0.5) * 20;
    const yTilt = (event.clientY / window.innerHeight - 0.5) * 20;
  });
  const responses = {
    yes: "Yes!! I’d love to 💕 You’ve been on my mind too, and honestly this just made my day. When and where are we going? 👀✨",
    maybe:
      "Hmm… I don’t know just yet 🙈. I really value what we have, and I need a little time to think. But the fact you asked me this way already means a lot. 💖",
    no: "I really appreciate you being this open with me 🥹. You’re amazing, and I don’t want to hurt you — but I don’t see us that way. I hope this doesn’t change the bond we already share. 🤍",
  };

  const phoneNumber = "237670852835";
  function sendToWhatsApp(message) {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;
    window.open(url, "_blank"); // opens WhatsApp in new tab/app
  }

  // Bind events
  yesBtn.addEventListener("click", () => sendToWhatsApp(responses.yes));
  maybeBtn.addEventListener("click", () => sendToWhatsApp(responses.maybe));
  nopeBtn.addEventListener("click", () => sendToWhatsApp(responses.no));

  move();
});
