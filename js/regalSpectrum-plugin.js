(function($) {
	$.regalSpectrum = function(element, options) {
		// Pour éviter la confusion avec $(this)on declare plugin comme variable pour l'instance de notre plugin
		var plugin = this;
		// On crée un objet vide qui contiendra les options de notre plugin
		plugin.o = {}
		// Référence à l'élément jQuery que le plugin affecte
		var $elem = $(element);
		// Référence à l'élément HTML que le plugin affecte
		var elem = element;
		// Mise en place des options par défaut et/ou en attributs data de $elem
		var defaults = {
			spectreView: ($elem.attr('data-spectreView') && $elem.attr('data-spectreView') != '') ? $elem.attr('data-spectreView') : 1,
			sinusoidView: ($elem.attr('data-sinusoidView') && $elem.attr('data-sinusoidView') != '') ? $elem.attr('data-sinusoidView') : 1,
			circlesView: ($elem.attr('data-circlesView') && $elem.attr('data-circlesView') != '') ? $elem.attr('data-circlesView') : 1,
			stopOthers: ($elem.attr('data-stopOthers') && $elem.attr('data-stopOthers') != '') ? $elem.attr('data-stopOthers') : 1,
			autoPlay: ($elem.attr('data-autoplay') && $elem.attr('data-autoplay') != '') ? $elem.attr('data-autoplay') : 0,
			color: ($elem.attr('data-color') && $elem.attr('data-color') != '') ? $elem.attr('data-color') : 0,
			volumeView: ($elem.attr('data-volumeView') && $elem.attr('data-volumeView') != '') ? $elem.attr('data-volumeView') : 0,
			loop: ($elem.attr('data-loop') && $elem.attr('data-loop') != '') ? $elem.attr('data-loop') : 0
		};
		//On récupère les data-values présente dans HTML (mais les values passées en JS prennent le dessus)
		if($elem.attr('data-values')){
			var dataValues = $elem.attr('data-values').replace(/'/g, '"');
			dataObj = JSON.parse(dataValues);
			defaults = {
				'spectreView': (dataObj.spectreView != null) ? dataObj.spectreView : defaults.spectreView,
				'sinusoidView':(dataObj.sinusoidView != null) ? dataObj.sinusoidView : defaults.sinusoidView,
				'circlesView': (dataObj.circlesView != null) ? dataObj.circlesView : defaults.circlesView,
				'stopOthers': (dataObj.stopOthers != null) ? dataObj.stopOthers : defaults.stopOthers,
				'color': (dataObj.color != null) ? dataObj.color : defaults.color,
				'volumeView': (dataObj.volumeView != null) ? dataObj.volumeView : defaults.volumeView,
				'loop': (dataObj.loop != null) ? dataObj.loop : defaults.loop
			}; 
		}

		// La méthode dite "constructeur" qui sera appelée lorsque l'objet sera crée
		plugin.init = function() {
			// on stocke les options dans un objet en fusionnant les options par defaut et celles ajoutées en parametre
			plugin.o = $.extend({}, defaults, options);
			// init spectrum height and width
			if(plugin.o.spectreView){
				$elem.find(".spectrum").attr('height', spectrumHeight);
				$elem.find(".spectrum").attr('width', spectrumWidth);
			}
			// init sineWave height and width
			if(plugin.o.sinusoidView){
				$elem.find(".sineWave").attr('height', sineWaveHeight);
				$elem.find(".sineWave").attr('width', sineWaveWidth);
			}
			// init circles height and width
			if(plugin.o.circlesView){
				$elem.find(".circles").attr('height', circlesHeight);
				$elem.find(".circles").attr('width', circlesWidth);
			}

			// auto update spectrum width
			$(window).resize(function() {
				if(plugin.o.spectreView){
					spectrumWidth = ($elem.find(".timeline .container").innerWidth() > 0) ? $elem.find(".timeline .container").innerWidth() : window.innerWidth ;
					$elem.find(".spectrum").attr('width', spectrumWidth);
				}
				if(plugin.o.sinusoidView){
					sineWaveWidth = ($elem.find(".timeline .container").innerWidth() > 0) ? $elem.find(".timeline .container").innerWidth() : window.innerWidth;
					$elem.find(".sineWave").attr('width', sineWaveWidth);
				}
				if(plugin.o.circlesView){
					circlesWidth = ($elem.find(".timeline .container").innerWidth() > 0) ? $elem.find(".timeline .container").innerWidth() : window.innerWidth;
					$elem.find(".circles").attr('width', circlesWidth);
				}
			});
			
			if(audioContextOK){			
				// Wait for window.onload to fire. See crbug.com/112368
				window.addEventListener('load', function(e) {
					setContext();
					
					$elem.find('.chapter-line').each(function() {
						var percent = (100 / sourceSound.duration) * parseFloat($(this).data('time')) + "%";
						$(this).css('left', percent);
					});
					
					plugin.ready = true;
				}, false);
			}
			else{
				//plugin.ready for old browsers
				plugin.ready = true;
				//hide chapters-line
				$elem.find('.chapters-line').css({'display': 'none'});
			}
			// playing update
			$elem.find('.sourceSound').on("timeupdate", function() {
				// update seekbar
				updateSeekbar();
			});
			
			// timeline navigation
			$elem.find('.timeline .progress').bind('click', function(event) {
				var clickPosition = event.clientX;
				var lineOffset = $elem.find('.container').offset().left;
				var lineLength = $elem.find('.timeline .progress .line').width();
				var time = sourceSound.duration * ((clickPosition - lineOffset) / lineLength);
				seek(time);
				// autoplay
				if($elem.find('.play').hasClass('pause')) {
					$elem.find('.play').click();
				}
			});
			
			//chapters
			$elem.find('.chapter').click(function(e){
				e.preventDefault();
				var time = $(this).data('time');
				seek(time);
				$elem.find('.chapter.active').removeClass('active');
				$(this).addClass('active');
			});
			
			//chapter-line
			$elem.find('.chapter-line').click(function(e){
				e.preventDefault();
				e.stopImmediatePropagation();
				var time = $(this).data('time');
				seek(time);
			});
			$elem.find('.chapter-line').each(function(index){
				$(this).hover(function(){
					var button = $elem.find('.chapter').eq(index);
					button.addClass('hover');
					var $roll = $elem.find('.chapters-line-roll');
					var lineOffset = $elem.find('.container').offset().left;
					var pox = $(this).offset().left - lineOffset;
					$roll.text($(this).text());
					if(pox + $roll.outerWidth() > $elem.find('.container').outerWidth()){
						pox = $elem.find('.container').outerWidth() - $roll.outerWidth();
					}
					$roll.css({'left': pox}).addClass('visible');
				}, function(){
					var button = $elem.find('.chapter').eq(index);
					button.removeClass('hover');
					$elem.find('.chapters-line-roll').removeClass('visible');
				});
			});
			
			// toggle play / pause
			$elem.find('.play').bind('click', function(event) {
				if($(this).hasClass('pause')) {
					play();
				} 
				else{
					pause();
				}
			});
			
			// toggle volume
			$elem.find('.volume').bind('click', function(event) {
				if($(this).hasClass('off')) {
					setVolume(1);
					$(this).removeClass('off');
				} 
				else{
					setVolume(0);
					$(this).addClass('off');
				}
			});
			
		}

		// Ici on va coder nos méthodes privées / publiques
		//publiques : plugin.nomFonction = function(){}
		//privées : var nomFonction = function(){}
		var setContext = function(){
			// setup a javascript node
			javascriptNode = context.createScriptProcessor(2048, 1, 1);
			javascriptNode.connect(context.destination);
			// setup a analyzer
			analyser = context.createAnalyser();
			analyser.smoothingTimeConstant = 0.3;
			sourceNode = context.createMediaElementSource(sourceSound);
			sourceNode.connect(analyser);
			analyser.connect(javascriptNode);
			sourceNode.connect(context.destination);
		}
		var play = function(){
			if(plugin.o.stopOthers){
				$('.spectrumSound.active').find('.play').trigger('click');
			}
			$elem.addClass('active');
			if($elem.find('.sourceSound').hasClass('video')){
				$elem.find('.sourceSound').addClass('active');
				var h = $elem.find('.sourceSound').height() + (parseInt($elem.find('.sourceSound').css('padding-top'), 10) * 2);
				$elem.css({'height': h});
			}
			draw();
			sourceSound.play();
			$elem.find('.play').removeClass('pause');
		}
		var pause = function(){
			$elem.removeClass('active');
			if($elem.find('.sourceSound').hasClass('video')){
				$elem.find('.sourceSound').removeClass('active');
				$elem.css({'height': 'auto'});
			}
			cancelAnimationFrame(drawAnimationFrame);
			sourceSound.pause();
			$elem.find('.play').addClass('pause');
		}
		var seek = function(time){
			var durationLoaded = sourceSound.buffered.end(sourceSound.buffered.length - 1);
			//if(time > durationLoaded){
			//	return;
			//}
			//else{
				context.close();
				setTimeout(function(){
					sourceSound.currentTime = time;
				}, 200);
				setTimeout(function(){
					context = new AudioContext();
					setContext();
				}, 400);
			//}
		}
		var setVolume = function(vol){
			sourceSound.volume = vol;
		}
		var audioContextOK = true;
		if (! window.AudioContext) {
			if (! window.webkitAudioContext) {
				// disable spectrum for old browsers 
				audioContextOK = false;
			}
			window.AudioContext = window.webkitAudioContext;
		}
		
		// Dessiner les canvas
		var drawAnimationFrame;
		var draw = function() {
			if(audioContextOK){
				drawAnimationFrame = requestAnimationFrame(draw);
				//sineWave
				if(plugin.o.sinusoidView){
					drawSineWave();
				}
				//bars
				if(plugin.o.spectreView){
					drawSpectrum();
				}
				//circles
				if(plugin.o.circlesView){
					drawCircles();
				}
				//volume
				if(plugin.o.volumeView){
					drawVolume();
				}
			}
		}
		// random color
		var randR = Math.round(Math.random() * (255 - 0) + 0);
		var randV = Math.round(Math.random() * (255 - 0) + 0);
		var randB = Math.round(Math.random() * (255 - 0) + 0);
		
		if(defaults.color){
			var colors = defaults.color.split(',');
			randR = colors[0];
			randV = colors[1];
			randB = colors[2];
		}
				
		// dataObj from HTML data-values
		var dataObj;
		
		// find sourceSound
		var sourceSound = $elem.find('.sourceSound').get(0);
			
		// create the audio context
		if(audioContextOK){
			var context = new AudioContext();
			
				sourceSound.addEventListener('ended',
					function(){
						seek(0);
						pause();
						if(defaults.loop){
							play();
						}
					}
				,false);
			
		}
		
		// vars for contextAudio
		var sourceNode;
		var analyser;
		var javascriptNode;
		
		// sineWave
		var canvas = $elem.find('.sineWave').get(0);
		var canvasCtx = canvas.getContext("2d");
		//var sineWaveWidth = canvas.width;
		var sineWaveWidth = ($elem.find(".timeline .container").innerWidth() > 0) ? $elem.find(".timeline .container").innerWidth() : window.innerWidth;
		var sineWaveHeight = canvas.height;
		var sineWaveFft = 2048;
		var bufferLength;				
		function drawSineWave() {
			analyser.fftSize = sineWaveFft;
			bufferLength = analyser.fftSize;				
			var dataArray = new Uint8Array(bufferLength);
			analyser.getByteTimeDomainData(dataArray);
			// clear the current state
			canvasCtx.clearRect(0, 0, sineWaveWidth, sineWaveHeight);
			// set the fill style
			canvasCtx.fillStyle = 'rgba(0, 0, 0, 0)';
			canvasCtx.fillRect(0, 0, sineWaveWidth, sineWaveHeight);
			canvasCtx.lineWidth = 10;
			//canvasCtx.strokeStyle = "rgba("+randR+", "+randV+", "+randB+", 0.5)";
			canvasCtx.strokeStyle = "rgba("+(255-randR)+", "+(255-randV)+", "+(255-randB)+", 0.5)";
			canvasCtx.beginPath();
			var sliceWidth = sineWaveWidth * 1.0 / bufferLength;
			var x = 0;
			for(var i = 0; i < bufferLength; i++) {
				var v = dataArray[i] / 128.0;
				var y = v * sineWaveHeight/2;
				if(i === 0) {
					canvasCtx.moveTo(x, y);
				} 
				else {
					canvasCtx.lineTo(x, y);
				}
				x += sliceWidth;
			}
			canvasCtx.lineTo(sineWaveWidth, sineWaveHeight/2);
			canvasCtx.stroke();
		};
		
		// spectrum
		var spectrumHeightRatio = 0.6;
		var spectrumHeight = $elem.find(".spectrum").height();
		var spectrumFft = 256;
		var spectrumWidth = ($elem.find(".timeline .container").innerWidth() > 0) ? $elem.find(".timeline .container").innerWidth() : window.innerWidth;
		var ctxCanvasSpectrumPos = $elem.find(".spectrumPos").get()[0].getContext("2d");
		var ctxCanvasSpectrumNeg = $elem.find(".spectrumNeg").get()[0].getContext("2d");	
		function drawSpectrum() {
			analyser.fftSize = spectrumFft;
			var array =  new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);
			// clear the current state
			ctxCanvasSpectrumPos.clearRect(0, 0, spectrumWidth, spectrumHeight);
			ctxCanvasSpectrumNeg.clearRect(0, 0, spectrumWidth, spectrumHeight);
			// set the fill style
			ctxCanvasSpectrumPos.fillStyle = "rgba("+randR+", "+randV+", "+randB+", 0.5)";
			ctxCanvasSpectrumNeg.fillStyle = "rgba("+randR+", "+randV+", "+randB+", 0.5)";
			for ( var i = 0; i < (array.length); i++ ){
				var value = array[i];
				var barHeight = value*spectrumHeightRatio;
				ctxCanvasSpectrumPos.fillRect(i*((spectrumWidth/spectrumFft)*2.4), spectrumHeight-barHeight, (spectrumWidth/spectrumFft)*2, barHeight);
				ctxCanvasSpectrumNeg.fillRect(i*((spectrumWidth/spectrumFft)*2.4), 0, (spectrumWidth/spectrumFft)*2, barHeight);
				//ctxCanvasSpectrumNeg.fillRect((array.length-i)*((spectrumWidth/spectrumFft)*2.4), 0, (spectrumWidth/spectrumFft)*2, barHeight);
			}
		};
		
		// circles
		var circlesHeightRatio = 0.25;
		var circlesHeight = $elem.find(".circles").height();
		var circlesFft = 32;
		var circlesWidth = ($elem.find(".timeline .container").innerWidth() > 0) ? $elem.find(".timeline .container").innerWidth() : window.innerWidth;
		var ctxCanvascircles = $elem.find(".circles").get()[0].getContext("2d");	
		function drawCircles() {
			analyser.fftSize = circlesFft;
			var circlesArray =  new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(circlesArray);
			// clear the current state
			ctxCanvascircles.clearRect(0, 0, circlesWidth, circlesHeight);
			// set the fill style
			ctxCanvascircles.fillStyle = "rgba("+randR+", "+randV+", "+randB+", "+5/circlesFft+")";
			var x = ((sourceSound.currentTime/sourceSound.duration)*circlesWidth) - parseInt($elem.find(".circles").css('left'), 10);
			for(var i = circlesArray.length-1; i >=0; i--) {
				ctxCanvascircles.beginPath();
				var v = circlesArray[i] * circlesHeightRatio;
				var y = circlesHeight/2;
				ctxCanvascircles.arc(x, y, v, 0, 2*Math.PI);
				ctxCanvascircles.fill();
			}
		};
		
		//volume-canvas
		if($elem.find(".volume-canvas").length){
			var volumeHeightRatio = 0.1;
			var ctxCanvasVolume = $elem.find(".volume-canvas").get()[0].getContext("2d");
			var volumeGradient = ctxCanvasVolume.createLinearGradient(0,0,0,150);
			volumeGradient.addColorStop(1, 'rgba('+randR+', '+randV+', '+randB+', 1)');
			volumeGradient.addColorStop(0.75, 'rgba('+randR+', '+randV+', '+randB+', 0.7)');
			volumeGradient.addColorStop(0.25, 'rgba('+randR+', '+randV+', '+randB+', 0.5)');
			volumeGradient.addColorStop(0, 'rgba('+randR+', '+randV+', '+randB+', 0.3)');
			var volumeFft = 32;
			function drawVolume(){
				analyser.fftSize = volumeFft;
				var volumeArray =  new Uint8Array(analyser.frequencyBinCount);
				analyser.getByteFrequencyData(volumeArray);
				var values = 0;
				var average = 0;
				var length = volumeArray.length;
				// get all the frequency amplitudes
				for (var i = 0; i < length; i++) {
					values += volumeArray[i];
				}
				average = (values / length);
				// clear the current state
				ctxCanvasVolume.clearRect(0, 0, 280, 150);
				// set the fill style
				ctxCanvasVolume.fillStyle = volumeGradient;
				// create the meters
				ctxCanvasVolume.fillRect(0, 150-average, 280, average);
			}
		}
		
		//update seek bar
		var lastUpdateSeekbar = 0;
		var updateSeekbar = function() {
			// limit exec interval to 300ms
			if(lastUpdateSeekbar > 0 && Math.abs(lastUpdateSeekbar - sourceSound.currentTime) < 0.3) {
				return true;
			}
			lastUpdateSeekbar = sourceSound.currentTime;

			// update timeline
			var percent = (100 / sourceSound.duration) * sourceSound.currentTime + "%";
			$elem.find('.timeline .progress .line .current').width(percent);

			// update current time
			var currentTime =  sourceSound.currentTime;
			var currentMinutes = Math.floor(currentTime / 60);
			var currentSeconds = Math.floor(currentTime % 60);
			if(currentSeconds.toString().length < 2) {
				currentSeconds = '0' + currentSeconds;
			}
			$elem.find('.timeline .currentTime').html(currentMinutes + ":" + currentSeconds);

			// update remaining time
			var remainingTime = sourceSound.duration - sourceSound.currentTime;
			var remainingMinutes = Math.floor(remainingTime / 60);
			var remainingSeconds = Math.floor(remainingTime % 60);
			if(remainingSeconds.toString().length<2) {
				remainingSeconds = '0' + remainingSeconds;
			}
			$elem.find('.timeline .remainingTime').html("- " + remainingMinutes + ":" + remainingSeconds);
			$elem.find('.chapter-line').each(function(){
				var chapterTime = $(this).data('time');
				var chapterEnd = $(this).data('end');
				if(currentTime >= parseFloat(chapterTime)) {
					$(this).addClass('done').removeClass('active');
					if(currentTime < parseFloat(chapterEnd)){
						$(this).removeClass('done').addClass('active');
					}
				}
				else{
					$(this).removeClass('done').removeClass('active');
				}
			});
		}
		
		plugin.ready = false;
		plugin.play = function(){
			play();
		}
		plugin.pause = function(){
			pause();
		}
		plugin.seek = function(time){
			seek(time);
		}
		plugin.setVolume = function(vol){
			setVolume(time);
		}
		// On appelle la méthode publique init qui va se charger de mettre en place toutes les méthodes de notre plugin pour qu'il fonctionne
		plugin.init();
	}

	// On ajoute le plugin à l'objet jQuery $.fn
	$.fn.regalSpectrum = function(options) {
		// Pour chacun des élément du dom à qui on a assigné le plugin
		return this.each(function() {
			// Si le plugin n'as pas deja été assigné à l'élément
			if (undefined == $(this).data('regalSpectrum')) {
				// On crée une instance du plugin avec les options renseignées
				var plugin = new $.regalSpectrum(this, options);
				// on stocke une référence de notre plugin pour pouvoir accéder à ses méthode publiques
				// appel depuis ext : $('#objet').data('regalSpectrum').fonctionPublique(params);
				$(this).data('regalSpectrum', plugin);
			}
		});
	}

})(jQuery);
