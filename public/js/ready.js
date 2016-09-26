tinysort.defaults.order = 'desc';
var gramIt = {
	fetchAndDisplay: function() {
		foo('fetchAndDisplay');
		$.each(
			usersTags,
			function(i,usersTags) {
				var feed = new Instafeed({
					get: 'user',
					clientId: 'c87a6995dc164521bcc4172a6f51f052',
					accessToken: usersTags.token,
					userId: usersTags.userId,
					mock: true,
					after: function() {
						// feed.next();
					},
					success: function(data) {
						var tagData = {};
						var htmlIds = usersTags.hashtags.slice(0);
						$.each(
							usersTags.hashtags,
							function(i,elem) {
								tagData[elem] = [];
							}
						);
						$.each(
							data.data,
							function(i,elem) {
								$.each(
									usersTags.hashtags,
									function(j,tag) {
										var tagIndex = elem.tags.indexOf(tag);
										if (tagIndex >= 0) {
											var html = '<div class="';
											if (!limit) {
												html += 'pure-u-1 pure-u-sm-1-2 pure-u-md-1-3 ';
											} else {
												usersTags.hashtags.splice(usersTags.hashtags.indexOf(tag), 1);
											}
											var scoreSplit = elem.caption.text.split('/');
											var scoreNumber = scoreSplit[0].split(' ');
											scoreNumber = scoreNumber[scoreNumber.length-1];
											html += 'image" data-date="' + elem.created_time + '" data-score="' + scoreNumber + '">';
											var score = Number(scoreNumber) / 2;
											var scoreHTML = '';
											for (var i = Math.floor(score) - 1; i >= 0; i--) {
												scoreHTML += '<span class="sh sh-star"></span>';
											}
											if (score.toString().indexOf('.') > 0) {
												scoreHTML += '<span class="sh sh-star-half-o"></span>';
											}
											for (var i = 4 - Math.ceil(score); i >= 0; i--) {
												scoreHTML += '<span class="sh sh-star-o"></span>'
											}
											html += '<div>';
											if (limit) {
												html += '<a href="/' + elem.user.username + '/' + tag + '">';
											} else {
												html += '<a target="_blank" href="' + elem.link + '">';
											}
											html += '<img src="' + elem.images.low_resolution.url + '"><br>';
											if (!limit) {
												html += '</a>';
												if (elem.location !== null) {
													html += '<a target="_blank" href="https://www.google.com/search?q=' + elem.location.name + '+' + usersTags.locations[j] + '">';
													html += elem.location.name + '';
													html += '<span class="score">' + scoreHTML + '</span>';
													html += '</a>';
												}
												if (elem.caption.text.indexOf('"') >= 0) {
													var caption = elem.caption.text;
													caption = caption.slice(caption.indexOf('"')+1,caption.lastIndexOf('"'));
													html += '<div class="badge"><span class="sh sh-trophy"></span><span>' + caption + '</span></div>';
												}
											} else {
												html += '#' + tag;
												html += '</a>';
											}
											html += '</div>';
											html += '</div>';
											tagData[tag].push(html);
										}
									}
								);
							}
						);
						$.each(
							htmlIds,
							function(i,elem) {
								var $this = $('#' + elem);
								$this.append(tagData[elem].toString().split('v>,<d').join('v><d'));
								$this.waitForImages(
									function() {
										$(this).find('.image > div').matchHeight();
									}
								);
							}
						);
						gramIt.onComplete();
					}
				});
				feed.run();
			}
		);
	},
	onComplete: function() {
		foo('onComplete');
		gramIt.transformImages();
		gramIt.bindSorts();
	},
	transformImages: function() {
		foo('transformImages');
		$.each(
			$('.image'),
			function(i,elem) {
				$(elem).children('div').eq(0).attr('class','t' + i%2);
			}
		);
	},
	bindSorts: function() {
		foo('bindSorts');
		$('[data-sort]').on(
			'click',
			function(e) {
				e.preventDefault();
				var $this = $(this);
				var hashtag = $this.attr('href')
				if ($this.hasClass('active')) {
					return false;
				} else {
					$this.parent().find('a').toggleClass('active');
				}
				var criteria = $this.attr('data-sort');
				tinysort(hashtag + ' > .image', { data: criteria });
				$(hashtag + ' > .image > div').css('height','auto').matchHeight();
				gramIt.transformImages();
			}
		);
	}
}
if (typeof usersTags !== 'undefined') {
	gramIt.fetchAndDisplay();
}
$().ready(function() {
	$('form [type="button"]').click(
		function() {
			var $this = $(this);
			var $form = $this.closest('form');
			var action = $form.attr('action');
			$form.attr('action',action.split('update').join('delete'));
			$form.submit();
		}
	);
	$('form [type="submit"]').click(
		function() {
			var $this = $(this).closest('form');
			var errors = 0;
			$.each(
				$this.find('input[name^="tag"]'),
				function(i,elem) {
					var $this = $(elem);
					var val = $(elem).val();
					val = val.split(' ').join('');
					$this.val(val);
				}
			);
			$.each(
				$this.find('input, textarea'),
				function(i,elem) {
					var $this = $(elem);
					var val = $(elem).val();
					if (val === '') {
						$this.addClass('invalid');
						errors++;
					} else {
						$this.removeClass('invalid');
					}
				}
			);
			if (errors > 0) {
				return false;
			}
		}
	);
});
