'use strict';

var prefs = self.options;
var observer;

function process() {
  console.log('process() start');

  var rubySelector = prefs.processInsertedContent ? 'ruby:not([hr-processed])' : 'ruby';
  var rubies = document.body.querySelectorAll(rubySelector);
  var rubyCount = rubies.length;

  if (rubyCount < 1) {
    console.log('process() end');
    return;
  }

  stopObserver();

  var isSegmented = !!document.body.querySelector(rubySelector + ' rt:nth-of-type(2)');
  var isMulti = !!document.body.querySelector(rubySelector + ' rtc:nth-of-type(2)');
  var dataset = [];

  console.log('collect [isSegmented:' + isSegmented + ', isMulti:' + isMulti + ']');

  for (let i = 0; i < rubyCount; i++) {
    let ruby = rubies[i];
    let rtElems = ruby.querySelectorAll('rt');
    let rtCount = rtElems.length;
    
    let doubleRuby = (!!ruby.querySelector('rt + rtc')
                  || !!ruby.querySelector('rt + rp + rtc')
                  || !!ruby.querySelector('rtc:nth-of-type(2)')
                  || !!ruby.querySelector('rt + rp + rt'));
      ruby.dataset.hrDouble = doubleRuby;

    if (rtCount < 1) {
      dataset.push(false);
      continue;
    }

    let rt = rtElems[0];

    if (!prefs.spaceRubyText && !isSegmented) {
      dataset.push([0, 0, [0, 0, [[rt, 0]]]]);
      continue;
    }

    let rpElems = ruby.querySelectorAll('rp');
    let rbWidth = ruby.clientWidth;
    let rubyChars = ruby.textContent.trim().length;
    let groups = [];
    let gElems = [[rt, 0]];
    let gWidth = rt.clientWidth;
    let gChars = rt.textContent.trim().length;
    let rpChars = 0;
    let rtChars = 0;

    for (let j = 1, jMax = rtCount; j < jMax; j++) {
      rt = rtElems[j];
      let isFirstChild = rt.previousElementSibling === null;
      let hasPrevText = false;
      let isPrevElementRt = false;
      let prevNode = rt.previousSibling;
      let isParentRtc = rt.parentNode.nodeName.toLowerCase() === 'rtc';
      let hasRp;
      while (prevNode !== null) {
        let nodeName = prevNode.nodeName.toLowerCase();
        if (nodeName === 'rt') {
          isPrevElementRt = true;
          break;
        }
        if (nodeName === 'rb' || (nodeName === '#text' && prevNode.textContent.trim().length > 0)) {
          hasPrevText = true;
          break;
        }
        if (isParentRtc && prevNode.nodeType === Node.ELEMENT_NODE) {
          break;
        }
        if (nodeName === 'rp') {
          hasRp = true;
        }
        prevNode = prevNode.previousSibling;
      }

      if (isFirstChild || (!hasPrevText && hasRp && !isParentRtc && isPrevElementRt)) {
        rtChars += gChars;
        groups.push([gWidth, gChars, gElems, 0]);
        gWidth = 0;
        gChars = 0;
        gElems = [];
      }
      gWidth += rt.clientWidth;
      gChars += rt.textContent.trim().length;
      gElems.push([rt, 0]);
    }
    rtChars += gChars;
    groups.push([gWidth, gChars, gElems, 0]);

    for (let j = 0, jMax = rpElems.length; j < jMax; j++) {
      rpChars += rpElems[j].textContent.trim().length;
    }

    dataset.push([rbWidth, rubyChars - rtChars - rpChars, groups]);
  }

  if (prefs.spaceRubyText) {
    console.log('space');

    for (let i = 0; i < rubyCount; i++) {
      let data = dataset[i];

      if (!data) {
        continue;
      }

      let ruby = rubies[i];
      let rbWidth = data[0];
      let rbChars = data[1];
      let groups = data[2];
      let maxWidth = rbWidth;

      for (let j = 0, jMax = groups.length; j < jMax; j++) {
        let group = groups[j];
        if (group[0] > maxWidth) {
          maxWidth = group[0];
        }
      }

      if (maxWidth > rbWidth) {
        ruby.style.width = maxWidth + 'px';
        if (rbChars > 1) {
          let perChar = (maxWidth - rbWidth) / rbChars;
          ruby.style.letterSpacing = perChar + 'px';
          ruby.style.textIndent = (perChar / 2) + 'px';
        }
      }

      for (let j = 0, jMax = groups.length; j < jMax; j++) {
        let group = groups[j];
        let gWidth = group[0];
        let gChars = group[1];

        if (maxWidth > gWidth) {
          let gElems = group[2];
          if (gChars === 1) {
            gElems[0][0].style.width = maxWidth + 'px';
          } else {
            let perChar = (maxWidth - gWidth) / gChars;
            group[3] = perChar;

            for (let k = 0, kMax = gElems.length; k < kMax; k++) {
              let rt = gElems[k][0];
              rt.style.letterSpacing = perChar + 'px';
              rt.style.textIndent = (perChar / 2) + 'px';
            }
          }
        }
      }
    }
  }

  if (isSegmented) {
    console.log('position');

    for (let i = 0; i < rubyCount; i++) {
      let data = dataset[i];
      let groups = data[2];

      for (let j = 0, jMax = groups.length; j < jMax; j++) {
        let group = groups[j];
        let gElems = group[2];
        let offset = 0;
        let indent = group[3] / 2;

        for (let k = 0, kMax = gElems.length; k < kMax; k++) {
          let elem = gElems[k];
          let eWidth = elem[0].clientWidth;
          elem[1] = offset;
          offset += eWidth - (eWidth === 0 ? 0 : indent);
        }
      }
    }
    for (let i = 0; i < rubyCount; i++) {
      let data = dataset[i];
      let groups = data[2];

      for (let j = 0, jMax = groups.length; j < jMax; j++) {
        let group = groups[j];
        let gElems = group[2];

        for (let k = 0, kMax = gElems.length; k < kMax; k++) {
          let elem = gElems[k];
          elem[0].style.marginLeft = elem[1] + 'px';
        }
      }
    }
  }

  if (prefs.processInsertedContent) {
    console.log('mark');

    for (let i = 0; i < rubyCount; i++) {
      rubies[i].setAttribute('hr-processed', 1);
    }
  }

  startObserver();

  console.log('process() end');
}

function register() {
  console.log('register() start');

  function checkNode(node) {
    return node.nodeType === Node.ELEMENT_NODE &&
      (node.nodeName.toLowerCase() === 'ruby' || node.querySelector('ruby')) &&
      node.querySelector('rt');
  }
  function checkMutation(mutation) {
    var i;
    for (i = mutation.addedNodes.length; i--;) {
      if (checkNode(mutation.addedNodes[i])) {
        console.log('observer found inserted ruby');
        return true;
      }
    }
    return false;
  }
  function onMutations(mutations) {
    var i, mutation;
    for (i = mutations.length; i--;) {
      mutation = mutations[i];
      if (mutation.type === 'childList' && mutation.addedNodes && checkMutation(mutation)) {
        process();
        break;
      }
    }
  }

  observer = new MutationObserver(onMutations);
  startObserver();

  console.log('register() end');
}

function startObserver() {
  if (observer) {
    console.log('starting observer');
    observer.observe(document.body, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: true
    });
    console.log('started observer');
  }
}

function stopObserver() {
  if (observer) {
    console.log('stopping observer');
    observer.disconnect();
    console.log('stopped observer');
  }
}

console.info(prefs);

process();
if (self.options.processInsertedContent) {
  register();
}
