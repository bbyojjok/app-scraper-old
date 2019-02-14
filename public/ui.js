function selectReview() {
  // 평점 체크박스
  $('.score input[type=checkbox]').bind('change', function() {
    if ($(this).is(':checked') === false) {
      $(this)
        .parent()
        .removeClass('checked');
    } else {
      $(this)
        .parent()
        .addClass('checked');
    }

    reviewRequest();
  });
  // 날짜 라디오박스
  $('.date input[type=radio]').bind('change', function() {
    if ($(this).is(':checked')) {
      $(this)
        .parent()
        .addClass('checked')
        .siblings()
        .removeClass('checked');
    }

    reviewRequest();
  });
}

function reviewRequest() {
  var $checkedScore = $('.score input[type=checkbox]:checked');
  var date_value = $('.date input[type=radio]:checked').val();
  var score_value = $checkedScore.length === 0 ? '12345' : '';
  if ($checkedScore.length !== 0) {
    for (var i = 0, len = $checkedScore.length; i < len; i++) {
      score_value += $checkedScore.eq(i).val();
    }
  }
  var date = '/' + date_value + '/' + score_value;
  console.log(date);

  // reviews android
  $.ajax({
    method: 'GET',
    url: '/api/review' + date + '/android',
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      console.log('android row 갯수:', data.length);

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
          review +=
            '<img src="https://cdn3.iconfinder.com/data/icons/flat-actions-icons-9/792/Star_Gold-512.png" alt="">';
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
            review +=
              '<img src="https://cdn2.iconfinder.com/data/icons/thesquid-ink-40-free-flat-icon-pack/64/support-512.png" alt="">';
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
      $('.reviews.android')
        .empty()
        .append(reviews);
      $('.reviewsWrap > div')
        .eq(0)
        .find('.total')
        .text(data.length);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });

  // reviews ios
  $.ajax({
    method: 'GET',
    url: '/api/review' + date + '/ios',
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      console.log('ios row 갯수:', data.length);

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
          review +=
            '<img src="https://lh6.googleusercontent.com/--04fMNiWWy8/AAAAAAAAAAI/AAAAAAAAAAA/Pd3-fFkI_sw/w96-h96-p/photo.jpg" alt="">';

          if (data[i].review.author != '') {
            review += '<span>' + data[i].review.author + '</span>';
          }
          review += '</li>';
          review += '<li class="_rate">';
          review +=
            '<img src="https://cdn3.iconfinder.com/data/icons/flat-actions-icons-9/792/Star_Gold-512.png" alt="">';
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
      $('.reviews.ios')
        .empty()
        .append(reviews);
      $('.reviewsWrap > div')
        .eq(1)
        .find('.total')
        .text(data.length);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });

  // details
  $.ajax({
    method: 'GET',
    url: '/api/details',
    contentType: 'application/json',
    dataType: 'json',
    success: function(data, textStatus, jqXHR) {
      // var android = [];
      // for (var key in data.android) {
      //   android.push('<li><span>' + key + '</span> : ' + data.android[key] + '</li>');
      // }
      // $('.details.android').append(android.join(''));

      // var ios = [];
      // for (var key in data.ios) {
      //   ios.push('<li><span>' + key + '</span> : ' + data.ios[key] + '</li>');
      // }
      //$('.details.ios').append(ios.join(''));

      $('.reviewsWrap > div')
        .eq(0)
        .find('.version .current')
        .text(data.android.version);
      $('.reviewsWrap > div')
        .eq(1)
        .find('.version .current')
        .text(data.ios.version);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      alert(jqXHR.responseText);
    }
  });
}

$(function() {
  selectReview();
  reviewRequest();

  /*
  <div class="_review"><div class="_star"><img src="https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678064-star-512.png" alt="3점">
<img src="https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678064-star-512.png" alt="3점">
<img src="https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678064-star-512.png" alt="3점"><span>점수</span> : 5</div><div class="_subject">제목이 제목이지 제목이 제목이겠냐</div><div class="_content">좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~ 좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~ 좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~ 좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~ 좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~ 좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~ 좋은 상품을 소개해주셔서 늘 애용하고있읍니다~~ 고마워요~</div><div class="_comment"><img src="https://cdn0.iconfinder.com/data/icons/faticons-2/31/comment21-512.png" alt=""></div><div class="_info"><span>아이디 : </span> hyundaihmall / <span>날짜 : </span>2019. 2. 9</div></div>
  */

  // details
  // $.ajax({
  //   method: 'GET',
  //   url: '/api/details',
  //   contentType: 'application/json',
  //   dataType: 'json',
  //   success: function(data, textStatus, jqXHR) {
  //     var android = [];
  //     for (var key in data.android) {
  //       android.push('<li><span>' + key + '</span> : ' + data.android[key] + '</li>');
  //     }
  //     $('.details.android').append(android.join(''));

  //     var ios = [];
  //     for (var key in data.ios) {
  //       ios.push('<li><span>' + key + '</span> : ' + data.ios[key] + '</li>');
  //     }
  //     $('.details.ios').append(ios.join(''));
  //   },
  //   error: function(jqXHR, textStatus, errorThrown) {
  //     alert(jqXHR.responseText);
  //   }
  // });
});
