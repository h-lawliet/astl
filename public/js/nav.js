window.onresize = function() {
  let header_height = document.querySelector('.header').clientHeight
  let body = document.getElementsByTagName('body')[0]
  body.style.marginTop = header_height + 'px'
}

window.onload = function() {
  let header_height = document.querySelector('.header').clientHeight
  let body = document.getElementsByTagName('body')[0]
  body.style.marginTop = header_height + 'px'
}

  function menucontrol() {
    let header_height = document.querySelector('.header').clientHeight
    let hiddenBar = document.querySelector('.hidden-bar')
    let main = document.querySelector('.main')
    let footer = document.querySelector('.footer')
    let Height = header_height+'px'
    let menubutton = document.querySelector('.menubutton')

    if (hiddenBar.style.display == 'block') {
      hiddenBar.style.display = 'none'
      main.style.display = 'block'
      footer.style.display = 'block'
      menubutton.innerHTML = "☰"
    } else {
      hiddenBar.style.display = 'block'
      hiddenBar.style.height = `calc(100vh - ${Height})`
      main.style.display = 'none'
      footer.style.display = 'none'
      menubutton.innerHTML = "✕"
    }
  }