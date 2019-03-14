function appScraperUi(site) {
  var $scoreLabel = $('.score label');
  var $scoreCheckbox = $('.score input[type=checkbox]');
  var $dateRadio = $('.date input[type=radio]');
  var $window = $(window);

  // 평점 체크박스
  $scoreLabel.bind('click', function() {
    if ($('.score label.checked').length === 1 && $(this).hasClass('checked')) {
      return false;
    }
  });

  $scoreCheckbox.bind('change', function() {
    if ($(this).is(':checked') === false) {
      $(this)
        .parent()
        .removeClass('checked');
    } else {
      $(this)
        .parent()
        .addClass('checked');
    }
    hashSet();
  });

  // 날짜 라디오박스
  $dateRadio.bind('change', function() {
    if ($(this).is(':checked')) {
      $(this)
        .parent()
        .addClass('checked')
        .siblings()
        .removeClass('checked');
    }
    hashSet();
  });

  // 엑셀 클릭
  $('.btnBox .xlsxBtn').bind('click', function() {
    xlsxRequest(site);
    return false;
  });

  // hashchange
  $window.bind('hashchange', function(e) {
    reviewRequest(site);
  });

  // ready
  if (location.hash === '') {
    hashSet();
    reviewRequest(site);
  } else {
    buttonSet();
    reviewRequest(site);
  }

  // ui
  $('.btnTop').bind('click', function() {
    $window.scrollTop(0);
    return false;
  });
  $window.bind('resize.ui', resizeSet);
  resizeSet();
}

function resizeSet() {
  var h =
    $(window).height() -
    ($('#header').outerHeight() +
      $('#siteWrap').outerHeight() +
      $('.btnBox').outerHeight() +
      $('.reviewsTitle').outerHeight() +
      50);
  $('.reviewsBox').height(h);
}

function buttonSet() {
  var hashArr = location.hash.slice(2).split('/');
  var dateValue = hashArr[0];
  var scoreValue = hashArr[1].split('');
  var $btnBox = $('.btnBox');

  $btnBox
    .find('.score input[type=checkbox]')
    .add('.date input[type=radio]')
    .parent('label')
    .removeClass('checked');
  $btnBox
    .find('.score input[type=checkbox]')
    .add('.date input[type=radio]')
    .prop('checked', false);

  for (var i = 0, len = scoreValue.length; i < len; i++) {
    $btnBox
      .find('.score input[type=checkbox][value=' + scoreValue[i] + ']')
      .parent('label')
      .addClass('checked');
    $btnBox.find('.score input[type=checkbox][value=' + scoreValue[i] + ']').prop('checked', true);
  }

  $btnBox
    .find('.date input[type=radio][value=' + dateValue + ']')
    .parent('label')
    .addClass('checked');
  $btnBox.find('.date input[type=radio][value=' + dateValue + ']').prop('checked', true);
}

function hashSet() {
  var $checkedScore = $('.score input[type=checkbox]:checked');
  var date_value = $('.date input[type=radio]:checked').val();
  var score_value = $checkedScore.length === 0 ? '12345' : '';
  if ($checkedScore.length !== 0) {
    for (var i = 0, len = $checkedScore.length; i < len; i++) {
      score_value += $checkedScore.eq(i).val();
    }
  }
  var date = '/' + date_value + '/' + score_value;
  location.hash = date;
}

function xlsxRequest(site) {
  var date = $('.date input[type=radio]:checked').val();
  $.ajax({
    method: 'GET',
    url: '/api/xlsx/' + site + '/' + date,
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      window.location.assign('/' + data.file);
      alert('선택 되어있는 날짜 기준으로\nexcel 파일로 저장되었습니다.');
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });
}

function reviewRequest(site) {
  var date = location.hash.slice(1);
  var timeDelay = 250;
  var timeFade = 500;
  var $reviewsAndroid = $('.reviews.android');
  var $reviewsIos = $('.reviews.ios');
  var $reviewsWrapDivFirst = $('.reviewsWrap > div').eq(0);
  var $reviewsWrapDivSecond = $('.reviewsWrap > div').eq(1);

  // reviews android
  $.ajax({
    method: 'GET',
    url: '/api/review/' + site + date + '/android',
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      var reviews = '';
      if (data.length !== 0) {
        for (var i = 0; i < data.length; i++) {
          var review = '';
          review += '<div class="_review">';
          // 제목
          if (data[i].review.title != '') {
            review += '<div class="_subject">' + data[i].review.title + '</div>';
          }

          // 내용
          review += '<div class="_content">' + data[i].review.text + '</div>';

          // 사용자, 별점, 등록일
          review += '<div class="_info">';
          review += '<ul>';
          review += '<li class="_user">';
          review += '<img src="' + data[i].review.userImage + '" alt="">';

          if (data[i].review.userName != '') {
            review += '<span>' + data[i].review.userName + '</span>';
          }
          review += '</li>';
          review += '<li class="_rate">';
          review += '<img src="/images/icon-star.png" alt="star">';
          review += '<span>' + data[i].review.score + '</span>';
          review += '</li>';
          review += '<li class="_date">';
          review += '<span>' + data[i].review.date + '</span>';
          review += '</li>';
          review += '</div>';
          review += '</div>';

          // 홈쇼핑 답변
          if (data[i].review.replyDate != null) {
            review += '<div class="_comment">';
            review += '<div class="_icon">';
            review += '<img src="/images/icon-reply-user.png" alt="reply-user">';
            review += '<span>' + data[i].review.replyDate + '</span>';
            review += '</div>';
            review += '<div class="_content">' + data[i].review.replyText + '</div>';
            review += '</div>';
          }

          reviews += '<li>' + review + '</li>';
        }
      } else {
        reviews += '<li class="not-exists">조회된 리뷰가 없습니다.</li>';
      }

      $reviewsAndroid
        .hide()
        .empty()
        .append(reviews)
        .delay(timeDelay)
        .fadeIn(timeFade);
      $reviewsWrapDivFirst
        .find('.total')
        .text(data.length)
        .end()
        .find('>div')
        .scrollTop(0);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });

  // reviews ios
  $.ajax({
    method: 'GET',
    url: '/api/review/' + site + date + '/ios',
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      var reviews = '';
      if (data.length !== 0) {
        for (var i = 0; i < data.length; i++) {
          var review = '';
          review += '<div class="_review">';
          // 제목
          if (data[i].review.title != '') {
            review += '<div class="_subject">' + data[i].review.title + '</div>';
          }

          // 내용
          review += '<div class="_content">' + data[i].review.comment + '</div>';

          // 사용자, 별점, 등록일
          review += '<div class="_info">';
          review += '<ul>';
          review += '<li class="_user">';
          review += '<img src="/images/icon-default-user.jpg" alt="default-user">';

          if (data[i].review.author != '') {
            review += '<span>' + data[i].review.author + '</span>';
          }
          review += '</li>';
          review += '<li class="_rate">';
          review += '<img src="/images/icon-star.png" alt="star">';
          review += '<span>' + data[i].review.rate + '</span>';
          review += '</li>';
          review += '<li class="_date">';
          review += '<span>' + data[i].review.updated + '</span>';
          review += '</li>';
          review += '</div>';
          review += '</div>';

          reviews += '<li>' + review + '</li>';
        }
      } else {
        reviews += '<li class="not-exists">조회된 리뷰가 없습니다.</li>';
      }

      $reviewsIos
        .hide()
        .empty()
        .append(reviews)
        .delay(timeDelay)
        .fadeIn(timeFade);
      $reviewsWrapDivSecond
        .find('.total')
        .text(data.length)
        .end()
        .find('>div')
        .scrollTop(0);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });

  // details
  $.ajax({
    method: 'GET',
    url: '/api/details/' + site,
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      $reviewsWrapDivFirst.find('.version').text(data.android.version);
      $reviewsWrapDivSecond.find('.version').text(data.ios.version);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });
}
