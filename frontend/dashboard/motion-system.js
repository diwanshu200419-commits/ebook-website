/* =====================================
   ULTRA MOTION SYSTEM v3
   SaaS / YC Dashboard Engine
===================================== */

document.addEventListener("DOMContentLoaded", () => {

  pageTransition();
  scrollReveal();
  cardTilt();
  rippleEffect();
  magneticButtons();
  cursorGlow();
  backgroundParallax();

});


/* =====================================
PAGE TRANSITION
===================================== */

function pageTransition(){

  document.body.style.opacity = "0";

  window.addEventListener("load", ()=>{

    document.body.style.transition = "opacity .6s ease";
    document.body.style.opacity = "1";

  });

}


/* =====================================
SCROLL REVEAL
===================================== */

function scrollReveal(){

  const elements =
    document.querySelectorAll(
      ".settings-card, .summary-item"
    );

  const observer =
    new IntersectionObserver(entries=>{

      entries.forEach(entry=>{

        if(entry.isIntersecting){

          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0px)";

          observer.unobserve(entry.target);

        }

      });

    },{
      threshold:0.15
    });

  elements.forEach(el=>{

    el.style.opacity="0";
    el.style.transform="translateY(50px)";
    el.style.transition=
      "opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1)";

    observer.observe(el);

  });

}


/* =====================================
3D CARD TILT
===================================== */

function cardTilt(){

  if(window.innerWidth < 768) return;

  const cards =
    document.querySelectorAll(
      ".settings-card, .summary-item"
    );

  cards.forEach(card=>{

    card.style.transformStyle="preserve-3d";
    card.style.willChange="transform";

    card.addEventListener("mousemove", e=>{

      const rect=card.getBoundingClientRect();

      const x=e.clientX-rect.left;
      const y=e.clientY-rect.top;

      const centerX=rect.width/2;
      const centerY=rect.height/2;

      const rotateX=((y-centerY)/centerY)*5;
      const rotateY=((centerX-x)/centerX)*5;

      card.style.transform=
        `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;

    });

    card.addEventListener("mouseleave",()=>{

      card.style.transition="transform .4s ease";
      card.style.transform="rotateX(0) rotateY(0)";

      setTimeout(()=>{
        card.style.transition="";
      },400);

    });

  });

}


/* =====================================
MAGNETIC BUTTON
===================================== */

function magneticButtons(){

  const buttons =
    document.querySelectorAll(
      ".btn-primary, .btn-secondary"
    );

  buttons.forEach(btn=>{

    btn.addEventListener("mousemove", e=>{

      const rect=btn.getBoundingClientRect();

      const x=e.clientX-rect.left-rect.width/2;
      const y=e.clientY-rect.top-rect.height/2;

      btn.style.transform=
        `translate(${x*0.25}px, ${y*0.25}px)`;

    });

    btn.addEventListener("mouseleave",()=>{
      btn.style.transform="translate(0,0)";
    });

  });

}


/* =====================================
BUTTON RIPPLE
===================================== */

function rippleEffect(){

  document.querySelectorAll("button").forEach(button=>{

    button.addEventListener("click", e=>{

      const rect=button.getBoundingClientRect();

      const circle=document.createElement("span");

      const diameter=Math.max(
        button.clientWidth,
        button.clientHeight
      );

      const radius=diameter/2;

      circle.style.width=
      circle.style.height=
        `${diameter}px`;

      circle.style.left=
        `${e.clientX-rect.left-radius}px`;

      circle.style.top=
        `${e.clientY-rect.top-radius}px`;

      circle.classList.add("ripple");

      const ripple=
        button.querySelector(".ripple");

      if(ripple) ripple.remove();

      button.appendChild(circle);

    });

  });

}


/* =====================================
CURSOR GLOW ENGINE
===================================== */

function cursorGlow(){

  const glow=document.querySelector(".cursor-glow");

  if(!glow) return;

  document.addEventListener("mousemove", e=>{

    glow.style.left=e.clientX+"px";
    glow.style.top=e.clientY+"px";

  });

}


/* =====================================
BACKGROUND PARALLAX
===================================== */

function backgroundParallax(){

  document.addEventListener("mousemove", e=>{

    const x=
      (window.innerWidth-e.pageX*2)/120;

    const y=
      (window.innerHeight-e.pageY*2)/120;

    document.body.style.backgroundPosition=
      `${x}px ${y}px`;

  });

}