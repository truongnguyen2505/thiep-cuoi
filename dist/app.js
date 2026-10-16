(() => {
  'use strict';
  const base = structuredClone(window.WEDDING_CONFIG);
  let config = structuredClone(base), albumIndex = 0, countdownInterval, receptionSide = 'groom';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const key = 'olive-wedding-' + (base.contentVersion || 'v1');
  const icons = {rings:'♧',heart:'♡',glass:'♧',music:'♫',spark:'✧'};
  const photo = n => config.photos[n % config.photos.length] || base.photos[0];
  const text = (tag, value, cls) => {const e = document.createElement(tag); e.textContent = value; if(cls)e.className=cls; return e;};
  const escapeScript = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)') || { matches: true };
  const albumTrack = $('#album-track');
  let albumCards = [], albumDots = [], albumSignature = '', albumFrame = 0;
  let albumScrollTimer, requestedAlbumIndex = null, albumGesture = null, suppressAlbumClick = false;
  let photoObserver, textObserver, lightboxRequest = 0, lightboxAnimation;
  const watchedImages = new WeakSet();
  function toast(message) {const e=$('#toast');e.textContent=message;e.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('show'),4200);}
  function modal(id) {const e=$(id);if(!e)return;e.showModal();document.body.classList.add('modal-open');}
  function closeDialog(e) {e.close();document.body.classList.remove('modal-open');}
  const invitationGate = $('#invitation-gate');
  let invitationGateTargets = [], invitationGateTimer;
  function setInvitationContentLocked(locked) {
    invitationGateTargets.forEach(element => { element.inert = locked; });
  }
  function finishInvitationOpen() {
    clearTimeout(invitationGateTimer);
    if (!invitationGate) return;
    invitationGate.hidden = true;
    invitationGate.classList.remove('is-opening');
    invitationGate.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('invitation-locked', 'invitation-opening');
    setInvitationContentLocked(false);
    initTextMotion();
    const main = $('#home');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
      setTimeout(() => main.removeAttribute('tabindex'), 0);
    }
  }
  function openInvitation() {
    const button = $('#invitation-open');
    if (!invitationGate || invitationGate.classList.contains('is-opening')) return;
    window.scrollTo(0, 0);
    button.disabled = true;
    invitationGate.classList.add('is-opening');
    document.body.classList.add('invitation-opening');
    playMusic();
    if (motionPreference.matches) {
      invitationGateTimer = setTimeout(finishInvitationOpen, 30);
      return;
    }
    const panel = $('.invitation-gate-panel-left', invitationGate);
    const finishOnPanel = event => {
      if (event.propertyName !== 'transform') return;
      panel.removeEventListener('transitionend', finishOnPanel);
      finishInvitationOpen();
    };
    panel?.addEventListener('transitionend', finishOnPanel);
    invitationGateTimer = setTimeout(finishInvitationOpen, 1500);
  }
  function initInvitationGate() {
    if (!invitationGate) {
      document.body.classList.remove('invitation-locked');
      return;
    }
    const button = $('#invitation-open');
    invitationGateTargets = [...document.body.children].filter(element => element !== invitationGate);
    invitationGate.hidden = false;
    invitationGate.classList.remove('is-opening');
    invitationGate.removeAttribute('aria-hidden');
    document.body.classList.add('invitation-locked');
    setInvitationContentLocked(true);
    button.disabled = false;
    button.addEventListener('click', openInvitation);
    requestAnimationFrame(() => button.focus({ preventScroll: true }));
  }
  $$('dialog').forEach(d => {d.addEventListener('close',()=>document.body.classList.remove('modal-open'));d.addEventListener('click',e=>{if(e.target===d && d.id!=='lightbox'){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(d);}});});
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.closest('dialog'))));
  function openDB() {return new Promise((resolve,reject)=>{const req=indexedDB.open(key,1);req.onupgradeneeded=()=>req.result.createObjectStore('settings');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  async function readConfig(){try{const db=await openDB();return await new Promise(resolve=>{const req=db.transaction('settings').objectStore('settings').get('config');req.onsuccess=()=>{resolve(req.result);db.close();};req.onerror=()=>{resolve(null);db.close();};});}catch{return null;}}
  async function saveConfig(value){const db=await openDB();try{await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put(value,'config');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
  function render() {
    const v={...config,...dateValues(config.date),groomInitial:config.groom.trim().split(/\s+/).pop().slice(0,1),brideInitial:config.bride.trim().split(/\s+/).pop().slice(0,1),receptionShortDate:dateValues(config.receptionDate).heroDate};
    $$('[data-bind]').forEach(e=>e.textContent=v[e.dataset.bind]??'');
    document.title=config.groom+' & '+config.bride+' · Thiệp mời cưới';
    $('meta[name=description]').content='Trân trọng kính mời bạn đến chung vui trong ngày thành hôn của '+config.groom+' và '+config.bride+'.';
    $$('[data-photo]').forEach(e=>{const n=Number(e.dataset.photo);e.src=photo(n);e.style.objectPosition='50% '+(config.photoPositions[n%config.photos.length]??50)+'%';});
    $$('[data-bind="groomOrder"],[data-bind="brideOrder"]').forEach(e=>e.hidden=!e.textContent.trim());
    $('#groom-ceremony-map').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(config.ceremonyAddress);
    $('#bride-ceremony-map').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(config.brideCeremonyAddress);
    renderAlbum();renderReception();clearInterval(countdownInterval);countdownInterval=setInterval(renderCountdown,1000);
    $('#timeline').replaceChildren(...config.schedule.map(row=>{const e=text('div','', 'timeline-row'),when=text('span','','timeline-when');when.append(text('span',row.time,'timeline-time'),text('small',shortDate(row.date||config.date),'timeline-date'));e.append(text('span',icons[row.icon]||'✧','timeline-icon'),when,text('span','','timeline-dot'),text('span',row.title,'timeline-name'));return e;}));
    $('#rsvp-open').hidden=!safeURL(config.rsvpUrl);
    if(config.editorEnabled===false)document.body.classList.add('hide-editor');
    preparePageImages();
    initTextMotion();
  }
  function dateValues(value){const d=new Date(value+'T12:00:00+07:00');return {day:d.getUTCDate(),monthLabel:'THÁNG '+(d.getUTCMonth()+1),year:d.getUTCFullYear(),weekday:['CHỦ NHẬT','THỨ HAI','THỨ BA','THỨ TƯ','THỨ NĂM','THỨ SÁU','THỨ BẢY'][d.getUTCDay()],heroDate:String(d.getUTCDate()).padStart(2,'0')+' . '+String(d.getUTCMonth()+1).padStart(2,'0')+' . '+d.getUTCFullYear()};}
  function shortDate(value){return value.split('-').reverse().join('.');}
  function currentReception(){return {date:config.receptionDate,time:config.receptionTime,venue:receptionSide==='groom'?config.venue:config.brideVenue,address:receptionSide==='groom'?config.address:config.brideAddress,mapEmbedUrl:receptionSide==='groom'?config.venueMapEmbedUrl:config.brideMapEmbedUrl,mapUrl:receptionSide==='groom'?config.venueMapUrl:config.brideMapUrl,hostLabel:'HẸN GẶP BẠN TẠI TIỆC '+(receptionSide==='groom'?'NHÀ TRAI':'NHÀ GÁI')};}
  function renderReception(){const reception=currentReception(),values={...dateValues(reception.date),...reception};$$('[data-reception-bind]').forEach(e=>e.textContent=values[e.dataset.receptionBind]??'');$$('[data-reception]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reception===receptionSide)));const query=encodeURIComponent(reception.venue+', '+reception.address),iframe=$('#venue-map'),mapURL=reception.mapEmbedUrl||'https://maps.google.com/maps?q='+query+'&z=15&output=embed';if(iframe.getAttribute('src')!==mapURL)iframe.src=mapURL;$('#map-link').href=reception.mapUrl||'https://www.google.com/maps/search/?api=1&query='+query;$('#directions-link').href=reception.mapUrl||'https://www.google.com/maps/dir/?api=1&destination='+query;renderCalendar(new Date(reception.date+'T12:00:00+07:00'));renderCountdown();}
  $$('[data-reception]').forEach(b=>b.addEventListener('click',()=>{receptionSide=b.dataset.reception;renderReception();}));
  function wrapAlbumIndex(index) {
    return (index % config.photos.length + config.photos.length) % config.photos.length;
  }

  function syncAlbumControls() {
    albumDots.forEach((dot, index) => {
      const active = index === albumIndex;
      dot.classList.toggle('active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
    albumCards.forEach((card, index) => card.classList.toggle('is-active', index === albumIndex));
    $('#album-progress').textContent = 'Ảnh ' + (albumIndex + 1) + ' / ' + config.photos.length;
    $('#album-prev').disabled = $('#album-next').disabled = config.photos.length < 2;
  }

  function nearestAlbumIndex() {
    const center = albumTrack.scrollLeft + albumTrack.clientWidth / 2;
    let nearest = 0, smallest = Infinity;
    albumCards.forEach((card, index) => {
      const offset = card.offsetLeft + card.offsetWidth / 2 - center;
      const distance = Math.min(Math.abs(offset) / Math.max(card.offsetWidth, 1), 1.5);
      card.style.setProperty('--slide-distance', String(distance));
      card.style.setProperty('--slide-offset', String(Math.max(-1, Math.min(1, offset / Math.max(card.offsetWidth, 1)))));
      if (Math.abs(offset) < smallest) {
        nearest = index;
        smallest = Math.abs(offset);
      }
    });
    return nearest;
  }

  function updateAlbumFromScroll() {
    albumFrame = 0;
    const nearest = nearestAlbumIndex();
    if (requestedAlbumIndex === null && !$('#lightbox').open && albumCards.length) {
      albumIndex = nearest;
      syncAlbumControls();
    }
  }

  function finishAlbumScroll() {
    requestedAlbumIndex = null;
    updateAlbumFromScroll();
  }

  function scrollAlbumTo(index, behavior = motionPreference.matches ? 'auto' : 'smooth') {
    const card = albumCards[index];
    if (!card) return;
    const left = card.offsetLeft - (albumTrack.clientWidth - card.offsetWidth) / 2;
    albumTrack.scrollTo({
      left: Math.max(0, Math.min(left, albumTrack.scrollWidth - albumTrack.clientWidth)),
      behavior
    });
    clearTimeout(albumScrollTimer);
    if (behavior === 'auto') {
      requestedAlbumIndex = null;
      updateAlbumFromScroll();
    } else {
      albumScrollTimer = setTimeout(finishAlbumScroll, 180);
    }
  }

  function selectAlbum(index, behavior) {
    albumIndex = wrapAlbumIndex(index);
    requestedAlbumIndex = albumIndex;
    syncAlbumControls();
    scrollAlbumTo(albumIndex, behavior);
  }

  function renderAlbum() {
    const signature = JSON.stringify([config.photos, config.photoPositions, config.groom, config.bride]);
    if (signature !== albumSignature) {
      albumSignature = signature;
      albumCards = config.photos.map((src, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'album-card album-slide';
        card.dataset.album = String(index);
        card.setAttribute('aria-label', 'Phóng to ảnh ' + (index + 1) + ' / ' + config.photos.length);
        const image = document.createElement('img');
        image.dataset.photo = String(index);
        image.src = src;
        image.alt = 'Khoảnh khắc của ' + config.groom + ' và ' + config.bride + ', ảnh ' + (index + 1);
        image.loading = 'lazy';
        image.decoding = 'async';
        image.draggable = false;
        image.width = 600;
        image.height = 800;
        image.style.objectPosition = '50% ' + (config.photoPositions[index] ?? 50) + '%';
        const caption = text('span', config.groom + ' & ' + config.bride, 'photo-caption');
        caption.setAttribute('aria-hidden', 'true');
        const frame = document.createElement('div');
        frame.className = 'album-image';
        frame.append(image);
        card.append(frame, caption);
        return card;
      });
      albumTrack.replaceChildren(...albumCards);
      albumDots = config.photos.map((_, index) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.dataset.albumIndex = String(index);
        dot.setAttribute('aria-label', 'Xem ảnh ' + (index + 1));
        return dot;
      });
      $('#album-dots').replaceChildren(...albumDots);
      albumIndex = wrapAlbumIndex(albumIndex);
      requestAnimationFrame(() => scrollAlbumTo(albumIndex, 'auto'));
    }
    syncAlbumControls();
  }
  function renderCalendar(d){const y=d.getUTCFullYear(),m=d.getUTCMonth(),day=d.getUTCDate();$('#calendar-title').textContent='Tháng '+(m+1)+' / '+y;const first=(new Date(Date.UTC(y,m,1)).getUTCDay()+6)%7,last=new Date(Date.UTC(y,m+1,0)).getUTCDate(),cells=[];for(let i=0;i<first;i++)cells.push(text('span',''));for(let n=1;n<=last;n++){const cell=text('span',n);if(n===day){cell.className='wedding-day';cell.replaceChildren(text('b',n));cell.setAttribute('aria-label','Ngày cưới: '+n+'/'+(m+1)+'/'+y);}cells.push(cell);}$('#calendar-days').replaceChildren(...cells);}
  function renderCountdown(){const target=new Date(config.receptionDate+'T'+config.receptionTime+':00+07:00').getTime(),now=Date.now(),seconds=Math.max(0,Math.floor((target-now)/1000));if(seconds===0){$('#countdown').replaceChildren(text('p',now<target+86400000?'Hôm nay mình cùng chung vui ♡':'Cảm ơn bạn đã cùng chung vui ♡','countdown-message'));return;}const values=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];$('#countdown').replaceChildren(...['NGÀY','GIỜ','PHÚT','GIÂY'].map((label,i)=>{const e=document.createElement('div');e.append(text('strong',String(values[i]).padStart(2,'0')),text('span',label));return e;}));}
  function moveAlbum(amount) {
    selectAlbum(albumIndex + amount);
  }
  $('#album-prev').addEventListener('click', () => moveAlbum(-1));
  $('#album-next').addEventListener('click', () => moveAlbum(1));
  $('#album-dots').addEventListener('click', event => {
    const dot = event.target.closest('button[data-album-index]');
    if (dot) selectAlbum(Number(dot.dataset.albumIndex));
  });

  albumTrack.addEventListener('scroll', () => {
    if (!albumFrame) albumFrame = requestAnimationFrame(updateAlbumFromScroll);
    clearTimeout(albumScrollTimer);
    albumScrollTimer = setTimeout(finishAlbumScroll, 140);
  }, { passive: true });

  const resizeAlbum = () => {
    if (albumCards.length) scrollAlbumTo(albumIndex, 'auto');
  };
  if (typeof ResizeObserver === 'function') new ResizeObserver(resizeAlbum).observe(albumTrack);
  else window.addEventListener('resize', resizeAlbum, { passive: true });

  albumTrack.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || event.button !== 0) return;
    suppressAlbumClick = false;
    requestedAlbumIndex = null;
    albumTrack.scrollTo({ left: albumTrack.scrollLeft, behavior: 'auto' });
    albumGesture = {
      id: event.pointerId, x: event.clientX, y: event.clientY,
      left: albumTrack.scrollLeft, mouse: event.pointerType === 'mouse', dragging: false
    };
  });
  albumTrack.addEventListener('pointermove', event => {
    const gesture = albumGesture;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.mouse && !(event.buttons & 1)) {
      albumGesture = null;
      albumTrack.classList.remove('is-dragging');
      return;
    }
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (Math.hypot(dx, dy) > 8) suppressAlbumClick = true;
    if (gesture.mouse && !gesture.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      gesture.dragging = true;
      albumTrack.classList.add('is-dragging');
      albumTrack.setPointerCapture(event.pointerId);
    }
    if (gesture.dragging) {
      event.preventDefault();
      albumTrack.scrollLeft = gesture.left - dx;
    }
  });
  function endAlbumGesture(event) {
    const gesture = albumGesture;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (event.type === 'pointercancel') suppressAlbumClick = true;
    albumGesture = null;
    albumTrack.classList.remove('is-dragging');
    if (albumTrack.hasPointerCapture(event.pointerId)) albumTrack.releasePointerCapture(event.pointerId);
    if (gesture.dragging) selectAlbum(nearestAlbumIndex());
  }
  window.addEventListener('pointerup', endAlbumGesture);
  window.addEventListener('pointercancel', endAlbumGesture);
  albumTrack.addEventListener('lostpointercapture', () => {
    albumGesture = null;
    albumTrack.classList.remove('is-dragging');
  });
  albumTrack.addEventListener('click', event => {
    if (suppressAlbumClick && event.detail !== 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      suppressAlbumClick = false;
      return;
    }
    const card = event.target.closest('.album-slide');
    if (!card || !albumTrack.contains(card)) return;
    selectAlbum(Number(card.dataset.album));
    renderLightbox();
    modal('#lightbox');
  });
  $('#photo-stack').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? config.photos.length - 1 :
      albumIndex + (event.key === 'ArrowRight' ? 1 : -1);
    selectAlbum(next);
    albumCards[albumIndex]?.focus({ preventScroll: true });
  });

  async function renderLightbox() {
    const request = ++lightboxRequest, index = albumIndex, src = photo(index);
    const image = $('#lightbox-img');
    if (image.getAttribute('src') !== src) {
      const next = new Image();
      next.src = src;
      try { if (typeof next.decode === 'function') await next.decode(); } catch {}
    }
    if (request !== lightboxRequest) return;
    lightboxAnimation?.cancel();
    image.src = src;
    image.alt = 'Ảnh cưới ' + (index + 1) + ' của ' + config.groom + ' và ' + config.bride;
    image.style.objectPosition = '50% ' + (config.photoPositions[index] ?? 50) + '%';
    $('#lightbox-counter').textContent = (index + 1) + ' / ' + config.photos.length;
    if (!motionPreference.matches && typeof image.animate === 'function') {
      lightboxAnimation = image.animate([
        { opacity: 0, transform: 'scale(.97)' },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
  }
  $('#lightbox-prev').addEventListener('click', () => { moveAlbum(-1); renderLightbox(); });
  $('#lightbox-next').addEventListener('click', () => { moveAlbum(1); renderLightbox(); });
  $('#lightbox').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    moveAlbum(event.key === 'ArrowLeft' ? -1 : 1);
    renderLightbox();
  });
  $('#lightbox').addEventListener('close', () => {
    lightboxRequest++;
    lightboxAnimation?.cancel();
    scrollAlbumTo(albumIndex, 'auto');
  });

  function preparePageImages() {
    $$('[data-photo]').forEach(image => {
      image.decoding = 'async';
      image.draggable = false;
      if (!watchedImages.has(image)) {
        const ready = () => image.classList.add('is-loaded');
        image.addEventListener('load', ready);
        image.addEventListener('error', ready);
        watchedImages.add(image);
      }
      image.classList.toggle('is-loaded', image.complete && image.naturalWidth > 0);
    });
  }

  function initPhotoMotion() {
    photoObserver?.disconnect();
    const frames = $$('.envelope-scene, .photo-stack, .map-frame');
    const enabled = !motionPreference.matches && typeof IntersectionObserver === 'function';
    document.documentElement.classList.toggle('motion-ready', enabled);
    frames.forEach(frame => {
      frame.classList.add('reveal-frame');
      frame.classList.toggle('is-visible', !enabled || frame.contains(document.activeElement));
    });
    if (!enabled) return;
    photoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-visible',
          entry.isIntersecting || entry.target.contains(document.activeElement));
      });
    }, { threshold: .08, rootMargin: '0px 0px -5% 0px' });
    frames.forEach(frame => photoObserver.observe(frame));
  }
  function initTextMotion() {
    textObserver?.disconnect();
    const elements = $$(
      'main .eyebrow, #couple-names > [data-bind], .hero-date, .hero-reception-date, ' +
      'main .section-title, main .display-title, .formal-copy, .formal-name, ' +
      '.ceremony-details, .date-divider, .year, .lunar-date, .ceremony-venues h3, ' +
      '.reception-intro, .reception-time, .reception-venue, .venue-address, ' +
      '.timeline-row, .thank-you, .footer-couple, .footer-date'
    );
    const enabled = !motionPreference.matches && typeof IntersectionObserver === 'function';
    document.documentElement.classList.toggle('text-motion-ready', enabled);
    elements.forEach(element => {
      element.classList.add('reveal-text');
      if (!enabled) element.classList.add('is-text-visible');
    });
    // The hero should animate after the envelope opens, not behind its cover.
    if (!enabled || (invitationGate && !invitationGate.hidden)) return;
    textObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-text-visible');
        textObserver.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(element => {
      if (!element.classList.contains('is-text-visible')) textObserver.observe(element);
    });
  }
  document.addEventListener('focusin', event => {
    event.target.closest?.('.reveal-frame')?.classList.add('is-visible');
    event.target.closest?.('.reveal-text')?.classList.add('is-text-visible');
  });
  motionPreference.addEventListener?.('change', () => {
    initPhotoMotion();
    initTextMotion();
    if (motionPreference.matches) {
      lightboxAnimation?.cancel();
      scrollAlbumTo(albumIndex, 'auto');
    }
  });
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('page-hidden', document.hidden);
    if(!document.hidden&&musicWantsPlay)playMusic();
  });
  const musicToggle=$('#music-toggle'),musicShell=$('#music-player'),musicAudio=$('#music-source');
  const musicExpand=$('#music-expand'),musicControls=$('#music-controls');
  let musicWantsPlay=true,musicPlaying=false,musicHasPlayed=false,musicExpanded=true;
  function setMusicExpanded(expanded) {
    if (!expanded && musicControls?.contains(document.activeElement)) {
      musicExpand?.focus({ preventScroll: true });
    }
    musicExpanded = expanded;
    musicShell?.classList.toggle('is-expanded', expanded);
    musicExpand?.setAttribute('aria-expanded', String(expanded));
    musicExpand?.setAttribute('aria-label', (expanded ? 'Thu gọn' : 'Mở') + ' trình phát nhạc');
    if (musicControls) {
      musicControls.inert = !expanded;
      musicControls.setAttribute('aria-hidden', String(!expanded));
    }
  }
  function syncMusicButton(playing) {
    musicPlaying = playing;
    musicShell?.classList.toggle('is-playing', playing);
    if (!musicToggle) return;
    const icon = musicToggle.querySelector('.music-toggle-icon');
    if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
    musicToggle.setAttribute('aria-pressed', String(playing));
    musicToggle.setAttribute('aria-label', (playing ? 'Dừng ' : 'Phát ') + (config.musicTitle || 'nhạc nền'));
  }
  async function playMusic(){musicWantsPlay=true;if(!musicAudio)return;musicAudio.volume=.38;try{await musicAudio.play();}catch{syncMusicButton(false);}}
  function pauseMusic(){musicWantsPlay=false;musicAudio?.pause();syncMusicButton(false);}
  function initMusicPlayer(){
    if(!musicToggle||!musicShell||!musicAudio||!config.musicFile){if(musicShell)musicShell.hidden=true;return;}
    setMusicExpanded(true);
    musicAudio.src=config.musicFile;
    musicAudio.volume=.38;
    const unlock = event => {
      if (musicShell.contains(event.target)) return;
      playMusic();
    };
    musicAudio.addEventListener('play',()=>syncMusicButton(true));
    musicAudio.addEventListener('playing', () => {
      syncMusicButton(true);
      if (musicHasPlayed) return;
      musicHasPlayed = true;
      if (musicExpand && musicControls) setMusicExpanded(false);
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    });
    musicAudio.addEventListener('pause',()=>syncMusicButton(false));
    musicAudio.addEventListener('ended',()=>{if(musicWantsPlay)playMusic();});
    musicAudio.addEventListener('error',()=>{syncMusicButton(false);musicToggle.title='Không thể tải file nhạc nền.';});
    musicToggle.addEventListener('click',()=>musicPlaying?pauseMusic():playMusic());
    musicExpand?.addEventListener('click', () => setMusicExpanded(!musicExpanded));
    musicShell.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !musicExpanded) return;
      event.preventDefault();
      setMusicExpanded(false);
      musicExpand?.focus({ preventScroll: true });
    });
    document.addEventListener('pointerdown', event => {
      if (musicHasPlayed && musicExpanded && !musicShell.contains(event.target)) setMusicExpanded(false);
    }, true);
    document.addEventListener('pointerdown',unlock,true);
    document.addEventListener('keydown',unlock,true);
    window.addEventListener('pageshow',()=>{if(musicWantsPlay)playMusic();});
    window.addEventListener('focus',()=>{if(musicWantsPlay)playMusic();});
    playMusic();
  }
  function download(data,name,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  const safeURL=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
  $('#rsvp-open').addEventListener('click',()=>{const url=safeURL(config.rsvpUrl);if(url){window.open(url,'_blank','noopener,noreferrer');return;}modal('#rsvp-dialog');});
  $('#rsvp-attendance').addEventListener('change',e=>$('#rsvp-guests').disabled=e.target.value==='no');
  $('#rsvp-form').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));data.time=new Date().toISOString();try{localStorage.setItem(key+'-rsvp',JSON.stringify(data));}catch{}closeDialog($('#rsvp-dialog'));toast('Đã lưu xác nhận mẫu trên thiết bị của bạn ♡');e.target.reset();$('#rsvp-guests').disabled=false;});
  const fields={
    couple:[['groom','Tên chú rể'],['bride','Tên cô dâu'],['groomFull','Họ tên chú rể'],['brideFull','Họ tên cô dâu'],['groomOrder','Thứ bậc chú rể'],['brideOrder','Thứ bậc cô dâu']],
    event:[['date','Ngày cử hành các nghi lễ','date'],['ceremonyTime','Giờ làm lễ','time'],['lunarDate','Ngày âm lịch của lễ','text',true],['ceremonyLocation','Địa điểm lễ thành hôn','text',true],['ceremonyAddress','Địa chỉ lễ thành hôn','text',true],['brideCeremonyLocation','Địa điểm lễ vu quy','text',true],['brideCeremonyAddress','Địa chỉ lễ vu quy','text',true],['receptionDate','Ngày tổ chức tiệc','date'],['receptionTime','Giờ mời tiệc','time'],['receptionLunarDate','Ngày âm lịch của tiệc','text',true],['venue','Địa điểm tiệc nhà trai','text',true],['address','Địa chỉ tiệc nhà trai','text',true],['brideVenue','Địa điểm tiệc nhà gái','text',true],['brideAddress','Địa chỉ tiệc nhà gái','text',true]],
    family:[['groomParents','Phụ huynh nhà trai','textarea'],['groomHometown','Địa chỉ nhà trai'],['brideParents','Phụ huynh nhà gái','textarea'],['brideHometown','Địa chỉ nhà gái']],
    integration:[['rsvpUrl','Liên kết biểu mẫu xác nhận tham dự','url']]
  };
  function addFields(target,items){const container=$(target);container.replaceChildren(...items.map(([name,label,type='text',full])=>{const div=text('div','','editor-field'+(full?' full':'')),l=text('label',label);l.htmlFor='edit-'+name;const inp=document.createElement(type==='textarea'?'textarea':'input');inp.id=l.htmlFor;inp.name=name;if(type!=='textarea')inp.type=type;else inp.rows=2;inp.value=config[name]||'';if(['groom','bride','groomFull','brideFull','date','ceremonyTime','receptionDate','receptionTime','venue','address','brideVenue','brideAddress','ceremonyAddress','brideCeremonyAddress'].includes(name))inp.required=true;inp.maxLength=400;div.append(l,inp);return div;}));}
  let pendingPhotos=[],pendingPositions=[];
  function fillEditor(){pendingPhotos=[...config.photos];pendingPositions=[...config.photoPositions];addFields('#couple-fields',fields.couple);addFields('#event-fields',fields.event);addFields('#family-fields',fields.family);addFields('#integration-fields',fields.integration);$('#edit-schedule').value=config.schedule.map(r=>(r.date||config.date)+' | '+r.time+' | '+r.title).join('\n');$('#editor-status').textContent='Thay đổi được lưu trong trình duyệt này. Chọn “Tải thiệp hoàn chỉnh” để tạo bản đem chia sẻ.';$('#photo-editors').replaceChildren(...Array.from({length:8},(_,i)=>{const row=text('div','','photo-editor'),img=document.createElement('img');img.src=photo(i);img.alt='Ảnh '+(i+1);img.style.objectPosition='50% '+(pendingPositions[i]??50)+'%';const controls=document.createElement('div'),label=text('label','Ảnh '+(i+1)+(i===0?' · ảnh bìa':''));label.htmlFor='photo-upload-'+i;const file=document.createElement('input');file.type='file';file.accept='image/*';file.id=label.htmlFor;file.addEventListener('change',async()=>{if(!file.files[0])return;try{const data=await readPhoto(file.files[0]);pendingPhotos[i]=data;pendingPositions[i]=50;img.src=data;range.value='50';img.style.objectPosition='50% 50%';$('#editor-status').textContent='Đã chọn ảnh '+(i+1)+'. Nhớ chọn Lưu thay đổi.';}catch(err){toast(err.message||'Không đọc được ảnh. Hãy thử ảnh JPG, PNG hoặc WebP.');}});const position=text('p','Vị trí ảnh: trên ↔ dưới','position-label'),range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value=String(pendingPositions[i]??50);range.setAttribute('aria-label','Vị trí ảnh '+(i+1));range.addEventListener('input',()=>{pendingPositions[i]=Number(range.value);img.style.objectPosition='50% '+range.value+'%';});controls.append(label,file,position,range);row.append(img,controls);return row;}));}
  function readPhoto(file){return new Promise((resolve,reject)=>{if(!file.type.startsWith('image/'))return reject(new Error('Hãy chọn tệp ảnh JPG, PNG hoặc WebP.'));if(file.size>30*1024*1024)return reject(new Error('Ảnh lớn hơn 30 MB. Hãy chọn ảnh nhỏ hơn nhé.'));const reader=new FileReader();reader.onerror=()=>reject(new Error('Không đọc được tệp ảnh.'));reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Ảnh chưa được hỗ trợ. Hãy chuyển sang JPG hoặc PNG.'));img.onload=()=>{const ratio=Math.min(1,1800/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#fafaf4';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.88));};img.src=reader.result;};reader.readAsDataURL(file);});}
  async function applyEditor(){
    const form=$('#editor-form');
    if(!form.reportValidity())return false;
    const data=Object.fromEntries(new FormData(form)),schedule=[];
    for(const [i,line] of data.scheduleText.split('\n').filter(l=>l.trim()).entries()){
      const parts=line.split('|').map(p=>p.trim());
      const [date,time,...titleParts]=parts,title=titleParts.join(' | ');
      const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(new Date(date+'T12:00:00Z').getTime())&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;
      if(!validDate||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!title){
        $('#editor-status').textContent='Lịch trình cần đúng dạng: 2026-11-23 | 17:00 | Tiệc thân mật';
        return false;
      }
      schedule.push({date,time,title,icon:config.schedule[i]?.icon||'spark'});
    }
    if(!schedule.length){$('#editor-status').textContent='Hãy thêm ít nhất một hoạt động vào lịch trình.';return false;}
    delete data.scheduleText;
    const selected=pendingPhotos.map((src,i)=>({src,position:pendingPositions[i]??50})).filter(p=>p.src);
    const next={...config,...data,schedule,photos:selected.map(p=>p.src),photoPositions:selected.map(p=>p.position)};
    try{await saveConfig(next);config=next;render();$('#editor-status').textContent='Đã lưu! Bạn có thể xem thiệp hoặc tải bản hoàn chỉnh để chia sẻ.';return true;}
    catch{config=next;render();$('#editor-status').textContent='Trình duyệt không cho lưu lâu dài. Bạn hãy tải thiệp hoàn chỉnh để giữ các thay đổi.';return true;}
  }
  function blobToDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});}
  async function inlineFontAssets(css) {
    const pattern = /url\(\s*['"]?(assets\/fonts\/[^'")\s]+)['"]?\s*\)/g;
    const paths = [...new Set([...css.matchAll(pattern)].map(match => match[1]))];
    const fonts = new Map(await Promise.all(paths.map(async path => {
      const response = await fetch(path);
      if (!response.ok) throw new Error("Không tải được phông chữ. Vui lòng thử lại.");
      return [path, await blobToDataURL(await response.blob())];
    })));
    return css.replace(pattern, (_, path) => 'url("' + fonts.get(path) + '")');
  }
  async function exportSite(){const button=$('#export-site');button.disabled=true;button.textContent='Đang chuẩn bị thiệp…';try{if(!await applyEditor())return;const fetchText=async path=>{const r=await fetch(path);if(!r.ok)throw new Error('Không tải được '+path);return r.text();};const [css,js]=await Promise.all([fetchText('styles.css'),fetchText('app.js')]);const exported={...config,editorEnabled:false,personalized:true,photoPositions:[...config.photoPositions]};exported.photos=await Promise.all(config.photos.map(async src=>{if(src.startsWith('data:'))return src;const r=await fetch(src);if(!r.ok)throw new Error('Không tải được ảnh cưới.');return blobToDataURL(await r.blob());}));const doc=document.documentElement.cloneNode(true);doc.classList.remove('motion-ready','page-hidden');doc.querySelectorAll('.reveal-frame').forEach(frame=>frame.classList.remove('is-visible'));doc.querySelector('link[href="styles.css"]').remove();doc.querySelectorAll('link[as="font"]').forEach(link=>link.remove());const style=document.createElement('style');style.textContent=await inlineFontAssets(css);doc.querySelector('head').append(style);const configScript=doc.querySelector('script[src="config.js"]');configScript.removeAttribute('src');configScript.removeAttribute('defer');configScript.textContent='window.WEDDING_CONFIG='+escapeScript(exported)+';';const appScript=doc.querySelector('script[src="app.js"]');appScript.remove();const inline=document.createElement('script');inline.textContent=js.replace(/<\/script/gi,'<\\/script');doc.querySelector('body').append(inline);doc.querySelector('#editor-dialog')?.remove();doc.querySelector('#edit-open')?.remove();doc.querySelector('body').classList.remove('modal-open');doc.querySelector('body').classList.add('hide-editor');doc.querySelectorAll('dialog').forEach(d=>d.removeAttribute('open'));doc.querySelectorAll('form').forEach(form=>{form.querySelectorAll('input,textarea').forEach(input=>{input.removeAttribute('value');if(input.tagName==='TEXTAREA')input.textContent='';});});doc.querySelectorAll('[data-photo]').forEach(img=>{const n=Number(img.dataset.photo);img.src=exported.photos[n%exported.photos.length];});doc.querySelector('#lightbox-img').removeAttribute('src');doc.querySelector('#toast').className='toast';doc.querySelector('#toast').textContent='';download('<!doctype html>\n'+doc.outerHTML,'thiep-cuoi.html','text/html;charset=utf-8');$('#editor-status').textContent='Đã tải thiep-cuoi.html với toàn bộ ảnh. Bạn có thể mở trực tiếp hoặc đưa tệp lên dịch vụ lưu trữ website.';toast('Đã tải thiệp hoàn chỉnh cùng ảnh của hai bạn ♡');}catch(err){$('#editor-status').textContent='Chưa xuất được thiệp. Hãy mở trang qua liên kết website rồi thử lại. '+err.message;}finally{button.disabled=false;button.textContent='Tải thiệp hoàn chỉnh ↓';}}
  if($('#edit-open')&&config.editorEnabled!==false){$('#edit-open').addEventListener('click',()=>{fillEditor();modal('#editor-dialog');});$('#editor-form').addEventListener('submit',async e=>{e.preventDefault();if(await applyEditor())toast('Đã lưu thiệp của hai bạn ♡');});$('#export-site').addEventListener('click',exportSite);$('#reset-template').addEventListener('click',async()=>{if(!window.confirm('Khôi phục thông tin ban đầu? Ảnh và thông tin bạn đã thay sẽ được gỡ khỏi bản lưu trên trình duyệt.'))return;try{await saveConfig(base);}catch{}config=structuredClone(base);albumIndex=0;render();fillEditor();toast('Đã khôi phục thông tin ban đầu.');});}
  render();
  initPhotoMotion();
  initMusicPlayer();
  initInvitationGate();
  if(!base.personalized)readConfig().then(saved=>{if(saved&&Array.isArray(saved.photos)&&saved.photos.length){config={...config,...saved};render();}});
})();
