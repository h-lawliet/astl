function selectYear() {
  let dv = event.currentTarget
  let id = `research_list_`+dv.innerText
  let target_list = document.getElementById(id)
  let children_list = document.querySelector('.research-list-container').children
  let scroll_children = document.querySelectorAll('.scroll-element')
  for (let i=0; i<children_list.length; i++) {
    children_list[i].style.display = 'none'
  }
  for (let j=0; j<scroll_children.length; j++) {
    scroll_children[j].style.backgroundImage = 'none'
    scroll_children[j].style.color = '#838282'
  }
  target_list.style.display = 'block'
  dv.style.backgroundImage = 'linear-gradient(to top left, rgb(116, 33, 211), rgb(52, 52, 227))'
  dv.style.color = 'white'
}

window.onload = function() {
  let scroll_children = document.querySelectorAll('.scroll-element')
  scroll_children[0].click()
  let header_height = document.querySelector('.header').clientHeight
  let body = document.getElementsByTagName('body')[0]
  body.style.paddingTop = header_height + 'px'
}

authors = document.querySelectorAll('#research-author')
for (let i=0; i<authors.length; i++) {
  authors[i].innerHTML = authors[i].innerHTML.replace('Ji Man Hong', '<strong>Ji Man Hong</strong>')
}
