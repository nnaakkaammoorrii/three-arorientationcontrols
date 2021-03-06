var THREE = (typeof require === 'undefined') ? THREE : require('three');
THREE.AROrientationControls = function(object, scene, domElement, options) {

	var scope = this;
	scope.object = object;
	scope.object.rotation.reorder('YXZ');

	scope.deviceOrientation = {};
	scope.screenOrientation = 0;
	scope.alphaOffset = 0; // radians

	scope.scene = scene;
	scope.domElement = domElement;

	scope.init = false;
	scope.enabled = false;

	var mode;

	var canUseDeviceorientation = false;
	var canUseCamera = false;

	var videoStream
	var bgVideo;
	var bgTrackSettings;
	var bgCanvas;
	var bgContext;

	var onDeviceOrientationChangeEventInit = function() {
		canUseDeviceorientation = true;
	};

	var getUserMedia = function(callback) {
		navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "environment" } }).then(function(stream) {
				videoStream = stream;
				bgVideo = document.createElement('video');
				bgVideo.autoplay = true;
				bgVideo.srcObject = stream;
				bgTrackSettings = stream.getVideoTracks()[0].getSettings();

				bgCanvas = document.createElement('canvas');
				bgCanvas.width = 256;
				bgCanvas.height = 256;
				bgContext = bgCanvas.getContext('2d');

				canUseCamera = true;

				if (callback) callback();
			})
			.catch(function(err) {
				canUseCamera = false;
				if (callback) callback();
			});
	};

	var init = function() {
		window.removeEventListener('deviceorientation', onDeviceOrientationChangeEventInit, false);

		if (options.mode === 'ar' && canUseDeviceorientation && canUseCamera) {
			mode = 'ar';
		}
		else {
			if ((options.mode === 'ar' && options.failSafe) || options.mode === 'vr') {
				mode = 'vr';
				if (videoStream) {
					videoStream.getVideoTracks()[0].stop();
					videoStream = null;
				}
			}
			else {
				if (options.error) options.error("Invalid mode or AR mode could not be started.");
			}
		}

		scope.init = true;
		scope.connect();
		if (options.success) options.success(mode);
	};

	var onDeviceOrientationChangeEvent = function(event) {
		scope.deviceOrientation = event;
	}

	var onScreenOrientationChangeEvent = function() {
		scope.screenOrientation = window.orientation || 0;
	};

	var setObjectQuaternion = function() {
		var zee = new THREE.Vector3(0, 0, 1);
		var euler = new THREE.Euler();
		var q0 = new THREE.Quaternion();
		var q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
		return function(quaternion, alpha, beta, gamma, orient) {
			euler.set(beta, alpha, -gamma, 'YXZ');
			quaternion.setFromEuler(euler);
			quaternion.multiply(q1);
			quaternion.multiply(q0.setFromAxisAngle(zee, -orient));
		};
	}();

	var onMouseMoveEvent = function(event) {
		mouseX = -(event.clientX / scope.domElement.clientWidth) * 2 + 1;
		mouseY = -(event.clientY / scope.domElement.clientHeight) * 2 + 1;

		scope.object.rotation.x = mouseY;
		scope.object.rotation.y = mouseX;
	};

	var rotateStart = null;
	var dragStart = new THREE.Vector2();
	var dragEnd = new THREE.Vector2();
	var dragDelta = new THREE.Vector2();

	var startRotate = function(clientX, clientY) {
		dragStart.set(clientX, clientY);
		rotateStart = new THREE.Vector2(scope.object.rotation.x, scope.object.rotation.y);
	}

	var doRotate = function(clientX, clientY) {
		if (rotateStart == null) return;

		dragEnd.set(clientX, clientY);

		dragDelta.subVectors(dragEnd, dragStart).multiplyScalar(0.5);

		scope.object.rotation.y = 2 * Math.PI * (dragDelta.x / scope.domElement.clientWidth) + rotateStart.y;
		scope.object.rotation.x = 2 * Math.PI * (dragDelta.y / scope.domElement.clientHeight) + rotateStart.x;
	}

	var endRotate = function() {
		rotateStart = null;
	}
	
	var onMouseDown = function(event) {
		startRotate(event.clientX, event.clientY);
	}
	
	var onMouseMove = function(event) {
		doRotate(event.clientX, event.clientY);
	}
	
	var onMouseUp = function(event) {
		endRotate();
	}
	
	var onTouchStart = function(event) {
		event.preventDefault();
		startRotate(event.touches[0].clientX, event.touches[0].clientY);
	}
	
	var onTouchMove = function(event) {
		event.preventDefault();
		event.stopPropagation();
		doRotate(event.touches[0].clientX, event.touches[0].clientY);
	}
	
	var onTouchEnd = function(event) {
		endRotate();
	}

	var connectAr = function() {
		onScreenOrientationChangeEvent(); // run once on load
		window.addEventListener('orientationchange', onScreenOrientationChangeEvent, false);
		window.addEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);

		if (videoStream == null) {
			getUserMedia();
		}
	}

	var connectVr = function() {
		document.addEventListener('mousedown', onMouseDown, false);
		document.addEventListener('mousemove', onMouseMove, false);
		document.addEventListener('mouseup', onMouseUp, false);
		
		document.addEventListener('touchstart', onTouchStart, {passive: false});
		document.addEventListener('touchmove', onTouchMove, {passive: false});
		document.addEventListener('touchend', onTouchEnd, {passive: false});
	}

	this.connect = function() {
		if (scope.enabled || !scope.init) return;

		if (mode === 'ar') {
			connectAr();
		}
		else if (mode === 'vr') {
			connectVr();
		}
		scope.enabled = true;
	};

	var disconnectAr = function() {
		window.removeEventListener('orientationchange', onScreenOrientationChangeEvent, false);
		window.removeEventListener('deviceorientation', onDeviceOrientationChangeEvent, false);

		videoStream.getVideoTracks().forEach(function(track) {
			track.stop();
		});
		videoStream = null;
		scene.background = null;
	}

	var disconnectVr = function() {
		document.removeEventListener('mousedown', onMouseDown, false);
		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);
		
		document.removeEventListener('touchstart', onTouchStart, false);
		document.removeEventListener('touchmove', onTouchMove, {passive: false});
		document.removeEventListener('touchend', onTouchEnd, false);
	}

	this.disconnect = function() {
		if (mode === 'ar') {
			disconnectAr();
		}
		else if (mode === 'vr') {
			disconnectVr();
		}
		scope.enabled = false;
	};

	var updateAr = function() {
		var device = scope.deviceOrientation;
		if (!device) return;

		var alpha = device.alpha ? THREE.Math.degToRad(device.alpha) + scope.alphaOffset : 0; // Z
		var beta = device.beta ? THREE.Math.degToRad(device.beta) : 0; // X'
		var gamma = device.gamma ? THREE.Math.degToRad(device.gamma) : 0; // Y''
		var orient = scope.screenOrientation ? THREE.Math.degToRad(scope.screenOrientation) : 0; // O
		setObjectQuaternion(scope.object.quaternion, alpha, beta, gamma, orient);

		if (bgVideo.readyState != bgVideo.HAVE_ENOUGH_DATA) return;

		bgContext.clearRect(0, 0, 256, 256);
		bgContext.drawImage(bgVideo, 0, 0, 256, 256);

		var bgTeture = new THREE.Texture(bgCanvas);
		bgTeture.needsUpdate = true;

		let canvasAspect = scope.domElement.clientWidth / scope.domElement.clientHeight;
		let imageAspect = scope.domElement.clientWidth > scope.domElement.clientHeight ? bgTrackSettings.width / bgTrackSettings.height : bgTrackSettings.height / bgTrackSettings.width;
		let aspect = imageAspect / canvasAspect;

		bgTeture.offset.x = aspect > 1 ? (1 - 1 / aspect) / 2 : 0;
		bgTeture.repeat.x = aspect > 1 ? 1 / aspect : 1;

		bgTeture.offset.y = aspect > 1 ? 0 : (1 - aspect) / 2;
		bgTeture.repeat.y = aspect > 1 ? 1 : aspect;

		if (scene.background) scene.background.dispose();
		scene.background = bgTeture;
	};

	var updateVr = function() {

	};

	this.update = function() {
		if (!scope.enabled) return;

		if (mode === 'ar') {
			updateAr();
		}
		else if (mode === 'vr') {
			updateVr();
		}
	};

	this.changeMode = function(change) {
		if (change === 'ar' && (!canUseDeviceorientation || !canUseCamera)) {
			return;
		}
		
		if (mode == change) {
			return;
		}
		
		scope.disconnect();
		mode = change;
		scope.connect();
	};

	if (options.mode === 'ar') {
		if (window.DeviceMotionEvent) {
			window.addEventListener('deviceorientation', onDeviceOrientationChangeEventInit, false);

			getUserMedia(function() {
				setTimeout(init, 1000);
			});
		}
	}
	else if (options.mode === 'vr') {
		init();
	}
	else {
		options.error('Invalid mode.');
	}
};

if (typeof module != 'undefined') {
	module.exports = exports.default = THREE.AROrientationControls;
}