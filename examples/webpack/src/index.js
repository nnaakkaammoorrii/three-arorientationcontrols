const THREE = require('three');
const AROrientationControls = require('three-arorientationcontrols');

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 67, window.innerWidth / window.innerHeight, 0.001, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

var controls = new THREE.AROrientationControls(camera, scene, renderer.domElement, {
	mode:'ar',
	failSafe: true, 
	success: function(mode) {
		if (mode == 'vr') {
			alert('It started in VR mode because the camera or sensor could not be used.');
			
			var geometry = new THREE.SphereGeometry(5, 60, 40);
			geometry.scale(-1, 1, 1);
			var material = new THREE.MeshBasicMaterial({
				map: THREE.ImageUtils.loadTexture('skybox.png')
			});
	
			var sphere = new THREE.Mesh(geometry, material);
			scene.add(sphere);
		}
	},
	error: function() {
		alert('It started in VR mode because the camera or sensor could not be used.');
	}
});
controls.connect();

const amlight = new THREE.AmbientLight(0xFFFFFF, 1.0);
scene.add(amlight);

var light = new THREE.DirectionalLight(0x999999);
light.position.set(0, 100, 0);
light.castShadow = true;
scene.add(light);

var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
cube.position.z = -2;
scene.add(cube);

var animate = function () {
	renderer.autoClear = false;
	renderer.clear();
	renderer.render(scene, camera);
	
	controls.update();
	requestAnimationFrame(animate);
};

animate();