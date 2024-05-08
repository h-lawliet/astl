let cont1 = document.querySelector('#prof_list_container1')
    let cont2 = document.querySelector('#prof_list_container2')
    let cont3 = document.querySelector('#prof_list_container3')
    let cont4 = document.querySelector('#prof_list_container4')
    let scrollelements = document.querySelectorAll('#scroll-element')

    function selectMenu() {
      let dv = event.currentTarget
      cont1.className = 'tab-off'
      cont2.className = 'tab-off'
      cont3.className = 'tab-off'
      cont4.className = 'tab-off'
      
      for (let i=0; i<4; i++) {
        scrollelements[i].className = 'btn-off'
      }
      dv.className = 'btn-on'
      if (dv.innerText == '경력 사항') {
        cont1.className = 'tab-on'
      } else if (dv.innerText == '교외 활동') {
        cont2.className = 'tab-on'
      } else if (dv.innerText == '수상 이력') {
        cont3.className = 'tab-on'
      } else {
        cont4.className = 'tab-on'
      }
    }

    window.onload = function() {
      scrollelements[0].click()
      let header_height = document.querySelector('.header').clientHeight
      let body = document.getElementsByTagName('body')[0]
      body.style.marginTop = header_height + 'px'
    }