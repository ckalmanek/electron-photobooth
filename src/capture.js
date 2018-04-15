const video = require('./video');
const countdown = require('./countdown');
const flash = require('./flash');
const effects = require('./effects');
const electron = require('electron');

const { ipcRenderer: ipc, shell, remote } = electron;

const images = remote.require('./images'); // access images cache in main process

let canvasTarget;
let seriously;
let videoSrc;

const formatImgTag = (doc, bytes) => {
  const div = doc.createElement('div');
  div.classList.add('photo');
  const close = doc.createElement('div');
  close.classList.add('photoClose');
  const img = new Image();
  img.classList.add('photoImg');
  img.src = bytes;
  div.appendChild(img);
  div.appendChild(close);
  return div;
}

window.addEventListener('DOMContentLoaded', _ => {
  const videoEl = document.getElementById('video');
  const canvasEl = document.getElementById('canvas');
  const recordEl = document.getElementById('record');
  const photosEl = document.getElementById('photos');
  const counterEl = document.getElementById('counter');
  const flashEl = document.getElementById('flash');

  // canvas context is not available since seriously has grabbed it
  // const ctx = canvasEl.getContext('2d');

  seriously = new Seriously();
  videoSrc = seriously.source('#video');
  canvasTarget = seriously.target('#canvas');
  effects.choose(seriously, videoSrc, canvasTarget);

  video.init(navigator, videoEl);

  recordEl.addEventListener('click', _ => {
    const setCount = count => counterEl.innerHTML = count > 0 ? count : '';
    countdown.start(3, setCount, _ => {
      flash(flashEl);
      // can't get context, so capture bytes from live canvas
      // const bytes = video.captureBytes(videoEl, ctx, canvas);      
      const bytes = video.captureBytesFromLiveCanvas(canvasEl);
      ipc.send('image-captured', bytes);
      photosEl.appendChild(formatImgTag(document, bytes));
    });
  }, false);

  photosEl.addEventListener('click', evt => {
    const isRm = evt.target.classList.contains('photoClose');
    const selector = isRm ? '.photoClose' : '.photoImg';

    const photos = Array.from(document.querySelectorAll(selector));
    const index = photos.findIndex(el => el == evt.target);

    if (index > -1) {
      if (isRm) 
        ipc.send('image-remove', index);
      else 
        shell.showItemInFolder(images.getFromCache(index));
    }
  });

}, false);

ipc.on('image-removed', (evt, index) => {
  document.getElementById('photos').removeChild(Array.from(document.querySelectorAll('.photo'))[index]);
});

ipc.on('effect-choose', (evt, effectName) => {
  effects.choose(seriously, videoSrc, canvasTarget, effectName);
});

ipc.on('effect-cycle', evt => {
  effects.cycle(seriously, videoSrc, canvasTarget);
});
