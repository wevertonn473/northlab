(function () {
  'use strict';
  var raiz = document.documentElement;
  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var economia = navigator.connection && navigator.connection.saveData;
  var WHATS = 'https://wa.me/5522999724863?text=';
  var pausado = false;
  var abertoEm = 0;

  /* Corte: cada quadro entra por uma diagonal, o mesmo ângulo da logo. */
  /* Observa o bloco, não o quadro: um elemento recortado não conta como visível. */
  var cortes = document.querySelectorAll('.corte');
  if ('IntersectionObserver' in window && !reduzir.matches) {
    raiz.classList.add('com-corte');
    var obsCorte = new IntersectionObserver(function (itens) {
      itens.forEach(function (item) {
        if (!item.isIntersecting) return;
        item.target.querySelectorAll('.corte').forEach(function (c) { c.classList.add('visto'); });
        obsCorte.unobserve(item.target);
      });
    }, { threshold: 0.08 });
    cortes.forEach(function (c) { obsCorte.observe(c.parentElement); });
  }

  /* Quadros vivos: só carregam e tocam quando estão na tela. */
  var videos = Array.prototype.slice.call(document.querySelectorAll('video[data-loop]'));
  /* Os quadros são curtos e mudos, então tocam sempre, mesmo com "reduzir movimento". Só a economia de dados desliga. */
  var movimentoLigado = !economia;

  function atualizar(v) {
    if (!movimentoLigado) return;
    if (v._naTela && !pausado && !document.hidden && v.offsetParent !== null) {
      if (!v.getAttribute('src')) v.src = v.getAttribute('data-loop');
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      v.pause();
    }
  }
  if ('IntersectionObserver' in window) {
    var obsVideo = new IntersectionObserver(function (itens) {
      itens.forEach(function (item) { item.target._naTela = item.isIntersecting; atualizar(item.target); });
    }, { rootMargin: '600px 0px' });
    videos.forEach(function (v) { obsVideo.observe(v); });
  }
  document.addEventListener('visibilitychange', function () { videos.forEach(atualizar); });
  /* O Modo Pouca Energia do iPhone bloqueia o play automático; um toque libera. */
  document.addEventListener('touchend', function () { videos.forEach(function (v) { if (v.paused) atualizar(v); }); }, { passive: true });

  /* Teclado: o cartão focado no carrossel do celular entra inteiro na tela. */
  document.querySelectorAll('.trio a').forEach(function (a) {
    a.addEventListener('focus', function () { if (a.matches(':focus-visible')) a.scrollIntoView({ block: 'nearest', inline: 'center' }); });
  });

  if (!movimentoLigado) raiz.classList.add('parado');

  /* Sala de projeção: o player só entra na página depois do clique. */
  var sala = document.getElementById('sala');
  var palco = document.getElementById('palco');
  var salaTitulo = document.getElementById('sala-titulo');
  var salaExterno = document.getElementById('sala-externo');
  var salaWhats = document.getElementById('sala-whats');

  function mensagem(titulo) {
    return WHATS + encodeURIComponent('Olá, NorthLab. Assisti ao trabalho ' + titulo + ' e quero conversar sobre a narrativa da minha marca.');
  }

  function aviso(texto) {
    palco.textContent = '';
    var p = document.createElement('p');
    p.className = 'palco-erro';
    p.textContent = texto;
    palco.appendChild(p);
  }

  function abrir(gatilho) {
    var ref = gatilho.getAttribute('data-video');
    var corte = ref.indexOf(':');
    var tipo = ref.slice(0, corte), id = ref.slice(corte + 1);
    var titulo = gatilho.getAttribute('data-titulo');

    salaTitulo.textContent = titulo;
    salaWhats.href = mensagem(titulo);
    palco.className = 'palco' + (gatilho.hasAttribute('data-retrato') ? ' palco-retrato' : '');
    palco.textContent = '';
    salaExterno.hidden = tipo === 'arquivo';

    if (tipo === 'arquivo') {
      var v = document.createElement('video');
      v.src = id;
      v.controls = true;
      v.autoplay = true;
      v.playsInline = true;
      v.poster = gatilho.getAttribute('data-poster') || '';
      v.addEventListener('error', function () {
        aviso('O vídeo não carregou. Verifique sua conexão e tente de novo.');
      });
      palco.appendChild(v);
      var pp = v.play(); if (pp && pp.catch) pp.catch(function () {});
    } else {
      var f = document.createElement('iframe');
      f.title = 'Player de vídeo: ' + titulo;
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      if (tipo === 'vimeo') {
        f.src = 'https://player.vimeo.com/video/' + id + '?autoplay=1&title=0&byline=0&portrait=0&dnt=1&color=FF6B35';
        salaExterno.textContent = 'Abrir no Vimeo';
      } else {
        f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
        salaExterno.textContent = 'Abrir no YouTube';
      }
      salaExterno.href = gatilho.href;
      /* O YouTube recusa o player quando a página é aberta direto do disco (erro 153). */
      if (tipo === 'youtube' && location.protocol === 'file:') {
        aviso('Aberto direto do computador, o YouTube não exibe o player. Use o link Abrir no YouTube.');
      } else {
        palco.appendChild(f);
      }
    }
    sala.showModal();
    abertoEm = Date.now();
    /* Com o filme aberto, os loops de trás descansam (bateria e banda); voltam ao fechar. */
    pausado = true;
    videos.forEach(atualizar);
  }

  document.addEventListener('click', function (e) {
    var gatilho = e.target.closest ? e.target.closest('[data-video]') : null;
    if (!gatilho || !sala || !sala.showModal) return;
    e.preventDefault();
    abrir(gatilho);
  });

  if (sala) {
    document.getElementById('sala-fechar').addEventListener('click', function () { sala.close(); });
    sala.addEventListener('click', function (e) {
      /* O segundo clique de um duplo clique não fecha nem pausa o filme que acabou de abrir. */
      if (Date.now() - abertoEm < 500) { e.preventDefault(); return; }
      if (e.target === sala || e.target.id === 'sala-meio') sala.close();
    }, true);
    sala.addEventListener('close', function () { palco.textContent = ''; pausado = false; videos.forEach(atualizar); });
  }

  /* No celular, a barra sai de cena enquanto o botão final, igual a ela, está à vista. */
  var barra = document.querySelector('.whats');
  var botaoFinal = document.querySelector('.chamada .botao-final');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (itens) {
      barra.classList.toggle('oculta', itens[0].isIntersecting);
    }).observe(botaoFinal);
  }

  var topo = document.getElementById('topo');
  function aoRolar() { topo.classList.toggle('solido', window.scrollY > 40); }
  aoRolar();
  window.addEventListener('scroll', aoRolar, { passive: true });

  /* Antes e depois */
  document.querySelectorAll('.compara').forEach(function (c) {
    var faixa = c.querySelector('input'), arrastando = false, x0 = 0, y0 = 0;
    function ajustar(v) { v = Math.max(0, Math.min(100, v)); faixa.value = v; c.style.setProperty('--p', v + '%'); }
    function mover(e) { var r = c.getBoundingClientRect(); ajustar((e.clientX - r.left) / r.width * 100); }
    c.addEventListener('pointerdown', function (e) { arrastando = true; c.setPointerCapture(e.pointerId); x0 = e.clientX; y0 = e.clientY; if (e.pointerType !== 'touch') mover(e); });
    c.addEventListener('pointermove', function (e) { if (arrastando && (e.pointerType !== 'touch' || Math.abs(e.clientX - x0) > Math.abs(e.clientY - y0))) mover(e); });
    c.addEventListener('pointerup', function (e) { if (arrastando && e.pointerType === 'touch') mover(e); arrastando = false; });
    c.addEventListener('pointercancel', function () { arrastando = false; });
    faixa.addEventListener('input', function () { ajustar(+faixa.value); });
  });
})();
