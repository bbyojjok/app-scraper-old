var AppScraperUi = (function(window, document, $) {
  function appScraperUi(site) {
    this.site = site;
    this.$window = $(window);
    this.$scoreLabel = $('.score label');
    this.$scoreCheckbox = $('.score input[type=checkbox]');
    this.$dateRadio = $('.date input[type=radio]');
    this.$btnBox = $('.btnBox');
    this.$xlsxBtn = this.$btnBox.find('.xlsxBtn');
    this.$btnTop = $('.btnTop');
    this.$header = $('#header');
    this.$siteWrap = $('#siteWrap');
    this.$reviewsTitle = $('.reviewsTitle');
    this.$reviewsBox = $('.reviewsBox');
    this.$reviewsAndroid = $('.reviews.android');
    this.$reviewsIos = $('.reviews.ios');
    this.$reviewsWrapDivFirst = $('.reviewsWrap > div').eq(0);
    this.$reviewsWrapDivSecond = $('.reviewsWrap > div').eq(1);
    this.timeDelay = 250;
    this.timeFade = 500;
    this.pageSize = 30;

    this.init();
  }

  appScraperUi.prototype = {
    /**
     * init() binding event
     */
    init: function() {
      var _this = this;

      // score check
      _this.$scoreLabel.bind('click', function() {
        if ($('.score label.checked').length === 1 && $(this).hasClass('checked')) {
          return false;
        }
      });
      _this.$scoreCheckbox.bind('change', function() {
        if ($(this).is(':checked') === false) {
          $(this)
            .parent()
            .removeClass('checked');
        } else {
          $(this)
            .parent()
            .addClass('checked');
        }
        _this.hashSet();
      });

      // date radio
      _this.$dateRadio.bind('change', function() {
        if ($(this).is(':checked')) {
          $(this)
            .parent()
            .addClass('checked')
            .siblings()
            .removeClass('checked');
        }
        _this.hashSet();
      });

      // xlsx click
      _this.$xlsxBtn.bind('click', function() {
        _this.xlsxRequest(_this.site);
        return false;
      });

      // hashchange
      _this.$window.bind('hashchange', function(e) {
        _this.buttonSet();
        _this.reviewRequest(_this.site);
      });

      // btnTop click
      _this.$btnTop.bind('click', function() {
        _this.$window.scrollTop(0);
        return false;
      });

      // ready
      if (location.hash === '') {
        _this.hashSet();
      } else {
        _this.buttonSet();
        _this.reviewRequest(_this.site);
      }

      _this.$window.bind('resize.ui', function() {
        _this.resizeSet(_this);
      });
      _this.resizeSet(_this);

      // progress bar set
      NProgress.configure({ speed: 750, trickleSpeed: 100, showSpinner: false });
    },

    /**
     * review height apply resize event
     */
    resizeSet: function(_this) {
      var reviewsBoxHeight =
        _this.$window.height() -
        (_this.$header.outerHeight() +
          _this.$siteWrap.outerHeight() +
          _this.$btnBox.outerHeight() +
          _this.$reviewsTitle.outerHeight() +
          50);
      _this.$reviewsBox.height(reviewsBoxHeight);
    },

    /**
     * get hash data apply button
     */
    buttonSet: function() {
      var hashArr = location.hash.slice(2).split('/');
      var dateValue = hashArr[0];
      var scoreValue = hashArr[1].split('');

      this.$btnBox
        .find('.score input[type=checkbox]')
        .add('.date input[type=radio]')
        .parent('label')
        .removeClass('checked');
      this.$btnBox
        .find('.score input[type=checkbox]')
        .add('.date input[type=radio]')
        .prop('checked', false);

      for (var i = 0, len = scoreValue.length; i < len; i++) {
        this.$btnBox
          .find('.score input[type=checkbox][value=' + scoreValue[i] + ']')
          .parent('label')
          .addClass('checked');
        this.$btnBox
          .find('.score input[type=checkbox][value=' + scoreValue[i] + ']')
          .prop('checked', true);
      }

      this.$btnBox
        .find('.date input[type=radio][value=' + dateValue + ']')
        .parent('label')
        .addClass('checked');
      this.$btnBox.find('.date input[type=radio][value=' + dateValue + ']').prop('checked', true);
    },

    /**
     * get button data apply hash
     */
    hashSet: function() {
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
    },

    /**
     * xlsx reqpuest
     * @param { String } site
     */
    xlsxRequest: function(site) {
      var date = $('.date input[type=radio]:checked').val();
      NProgress.start();
      $.ajax({
        method: 'GET',
        url: '/api/xlsx/' + site + '/' + date,
        contentType: 'application/json',
        dataType: 'json',
        success: function(data, textStatus, jqXHR) {
          NProgress.done();
          window.location.assign('/' + data.file);
          alert('선택 되어있는 날짜 기준으로\nexcel 파일로 저장되었습니다.');
        },
        error: function(jqXHR, textStatus, errorThrown) {
          alert(jqXHR.responseText);
        }
      });
    },

    /**
     * parser details
     * @param { Object } data
     */
    parserDetails: function(data) {
      this.$reviewsWrapDivFirst
        .find('.version')
        .text(data.android.version)
        .end()
        .find('.star')
        .text(data.android.scoreText);
      this.$reviewsWrapDivSecond
        .find('.version')
        .text(data.ios.version)
        .end()
        .find('.star')
        .text(data.ios.ratingsAverages);
    },

    /**
     * parser review android render
     * @param { Object } data
     */
    parserReviewAndroidRender: function(data) {
      var reviews = '';
      if (data.length !== 0) {
        for (var i = 0; i < data.length; i++) {
          var review = '';
          review += '<div class="_review">';
          // 제목
          if (data[i].review.title !== '' && data[i].review.title !== null) {
            review += '<div class="_subject">' + data[i].review.title + '</div>';
          }

          // 내용
          review += '<div class="_content">' + data[i].review.text + '</div>';

          // 사용자, 별점, 등록일
          review += '<div class="_info">';
          review += '<ul>';
          review += '<li class="_user">';
          review += '<img src="' + data[i].review.userImage + '" alt="">';

          if (data[i].review.userName !== '') {
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
          if (data[i].review.replyDate !== null) {
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

      return reviews;
    },

    /**
     * parser review ios render
     * @param { Object } data
     */
    parserReviewIosRender: function(data) {
      var reviews = '';
      if (data.length !== 0) {
        for (var i = 0; i < data.length; i++) {
          var review = '';
          review += '<div class="_review">';
          // 제목
          if (data[i].review.title !== '') {
            review += '<div class="_subject">' + data[i].review.title + '</div>';
          }

          // 내용
          review += '<div class="_content">' + data[i].review.comment + '</div>';

          // 사용자, 별점, 등록일
          review += '<div class="_info">';
          review += '<ul>';
          review += '<li class="_user">';
          review += '<img src="/images/icon-default-user.jpg" alt="default-user">';

          if (data[i].review.author !== '') {
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

      return reviews;
    },

    /**
     * parser review
     * @param { Object } data
     * @param { String } os
     */
    parserReview: function(data, os) {
      var _this = this;
      var count = 0;
      var isMobile = this.$window.width() <= 780 ? true : false;
      var $scrollWrap = os === 'android' ? _this.$reviewsBox.eq(0) : _this.$reviewsBox.eq(1);
      var $targetReviewList = os === 'android' ? this.$reviewsAndroid : this.$reviewsIos;
      var $targetReviewTop =
        os === 'android' ? this.$reviewsWrapDivFirst : this.$reviewsWrapDivSecond;
      var firstData = isMobile ? data : data.slice(0, _this.pageSize);
      var firstReviews =
        os === 'android'
          ? this.parserReviewAndroidRender(firstData)
          : this.parserReviewIosRender(firstData);
      var scrollTimer;
      var lastScrollFireTime = 0;
      var update = function($this) {
        if (
          $this.scrollTop() + parseInt($scrollWrap.height() / 3) >=
          $targetReviewList.height() - $scrollWrap.height()
        ) {
          count++;
          var applyData = data.slice(_this.pageSize * count, _this.pageSize * (count + 1));
          if (applyData.length !== 0) {
            NProgress.start();
            var reviews =
              os === 'android'
                ? _this.parserReviewAndroidRender(applyData)
                : _this.parserReviewIosRender(applyData);
            $targetReviewList.append(reviews);
            NProgress.done();
          } else {
            $scrollWrap.unbind('scroll.load');
          }
        }
      };

      $scrollWrap.unbind('scroll.load');
      if (data.length > 30 || !isMobile) {
        $scrollWrap.bind('scroll.load', function() {
          var minScrollTime = 500;
          var now = new Date().getTime();
          var $this = $(this);
          if (!scrollTimer) {
            if (now - lastScrollFireTime > 3 * minScrollTime) {
              update($this);
              lastScrollFireTime = now;
            }
            scrollTimer = setTimeout(function() {
              scrollTimer = null;
              lastScrollFireTime = new Date().getTime();
              update($this);
            }, minScrollTime);
          }
        });
      }

      $targetReviewList
        .hide()
        .empty()
        .append(firstReviews)
        .delay(this.timeDelay)
        .fadeIn(this.timeFade);
      $targetReviewTop
        .find('.total')
        .text(data.length)
        .end()
        .find('>div')
        .scrollTop(0);
    },

    /**
     * api request
     * @param { String } site
     */
    reviewRequest: function(site) {
      var _this = this;
      var date = location.hash.slice(1);
      var reqpuestData = {
        review_android: '/review/' + site + date + '/android',
        review_ios: '/review/' + site + date + '/ios',
        details: '/details/' + site
      };

      NProgress.start();
      $.ajax({
        method: 'POST',
        url: '/api',
        dataType: 'json',
        data: reqpuestData,
        success: function(data, textStatus, jqXHR) {
          if (data.details !== '') {
            _this.parserDetails(data.details);
          }
          _this.parserReview(data.review_android, 'android');
          _this.parserReview(data.review_ios, 'ios');

          NProgress.done();
        },
        error: function(jqXHR, textStatus, errorThrown) {
          alert(jqXHR.responseText);
        }
      });
    }
  };

  return appScraperUi;
})(window, document, jQuery);

function adminSet() {
  var base64 = null;

  $('#fileUploadInput').bind('change', function(e) {
    var file = e.target.files[0];
    if (file) {
      var reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function() {
        base64 = reader.result;
        $('#uploadImage')
          .empty()
          .append('<img src="' + reader.result + '" alt="" />');
      };
      reader.onerror = function(error) {
        console.log('Error: ', error);
      };
    } else {
      base64 = null;
      $('#uploadImage').empty();
    }
  });

  $('#fileUploadSubmit').bind('click', function() {
    var name = $('input[name=name]').val();
    var googlePlayAppId = $('input[name=googlePlayAppId]').val();
    var appStoreId = $('input[name=appStoreId]').val();
    var reqpuestData = {
      name: name,
      googlePlayAppId: googlePlayAppId,
      appStoreId: appStoreId,
      image: base64
    };

    if (name == '' || googlePlayAppId == '' || appStoreId == '' || base64 == null) {
      alert('입력필드가 비어있습니다');
      return;
    }

    $.ajax({
      method: 'POST',
      url: '/api/sites',
      dataType: 'json',
      data: reqpuestData,
      success: function(data, textStatus, jqXHR) {
        //console.log(data);
        alert('스크랩할 사이트가 추가됬습니다.');
        location.reload(true);
      },
      error: function(jqXHR, textStatus, errorThrown) {
        alert(jqXHR.responseText);
      }
    });
  });
}

function loginSet() {
  $('#loginBtn').bind('click', function() {
    var username = $('input[name=username]').val();
    var password = $('input[name=password]').val();
    var reqpuestData = {
      username: username,
      password: password
    };

    if (username == '' || password == '') {
      alert('입력필드가 비어있습니다');
      return;
    }

    $.ajax({
      method: 'POST',
      url: '/api/login',
      dataType: 'json',
      data: reqpuestData,
      success: function(data, textStatus, jqXHR) {
        console.log(data);
        if (data.success) {
          location.href = '/admin';
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        alert(jqXHR.responseText);
      }
    });
  });

  $('input[name=password], input[name=username]').bind('keydown', function(e) {
    if (e.keyCode === 13) {
      $('#loginBtn').trigger('click');
    }
  });
}
