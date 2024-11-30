// to start vite server, open terminal and do "npm run dev" or "npx vite"

//import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
//import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
//import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
import gsap from 'https://cdn.skypack.dev/gsap';
import * as THREE from './example/three.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.171.0/examples/jsm/loaders/GLTFLoader.js'; // for loading models
import * as CANNON from 'https://unpkg.com/cannon-es@0.19.0/dist/cannon-es.js'; // npm install cannon-es --save-dev
//import CannonDebugger from 'cannon-es-debugger'; // npm install cannon-es-debugger
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.171.0/examples/jsm/controls/OrbitControls.js' // moving object around with mouse

const raycaster = new THREE.Raycaster(); // for mouse move tracking (points at scene from mouse, it knows if its hitting object)
const scene = new THREE.Scene(); // creating scene
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 ); // creating the camera
const renderer = new THREE.WebGLRenderer(); // renderer? all 3 needed ^

renderer.setSize( window.innerWidth, window.innerHeight ); // setting the size to the device size
renderer.setPixelRatio(devicePixelRatio); //help jaggity edges
document.body.appendChild( renderer.domElement );

//new OrbitControls(camera, renderer.domElement); // creates the orbit controls for the camera

camera.position.z = 50; // pulls the camera away from the center
camera.lookAt(new THREE.Vector3(0,-2,0)); // set camera to be looking down just slightly to hide plane edge

const light = new THREE.DirectionalLight(0xFFFFFF); // create a light source
light.position.set(0, 300, 200); // position the light right over the object
light.target.position.set(0, 0, 0);
light.castShadow = true; // means that the light does cast shadows
light.shadow.bias = -0.0;
light.shadow.mapSize.width = 6000;
light.shadow.mapSize.height = 6000;
light.shadow.camera.near = 200;
light.shadow.camera.far = 600;
light.shadow.camera.left = 400;
light.shadow.camera.right = -400;
light.shadow.camera.top = 200;
light.shadow.camera.bottom = -200;
scene.add(light); // add the light to the scene

//scene.add( new THREE.CameraHelper( light.shadow.camera ) ); // for helping with shadows

let amlight = new THREE.AmbientLight(0x404040, 5);
scene.add(amlight);

const backLight = new THREE.DirectionalLight(0xFFFFFF, 1); // add another light behind the object to see it from that side
backLight.position.set(0, 1, -1);
scene.add(backLight);

renderer.shadowMap.enabled = true; // creates shadows
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // soft shadows added to scene

const planeGeometry = new THREE.PlaneGeometry(500, 500, 100, 100); // creates a plane object
const planeMaterial = new THREE.MeshPhongMaterial({ // defines what the plane looks like
  //color: 0xFF00FF,
  side: THREE.DoubleSide, // determines that both sides will have color/material
  flatShading: true, // helps with lighting on slopes/edges
  vertexColors: true // say that we want to use colors for vertices
});
const planeMesh = new THREE.Mesh(planeGeometry,planeMaterial); // creates the mesh between the vertices

// vertex position randomization
const {array} = planeMesh.geometry.attributes.position // creates a set of points that exist within the plane from its geometry
const randomValues = []; // initialize array to individualize values

for (let i = 0 ; i < array.length; i++) { // go through all points and give them a variable value
  
  if (i % 3 === 0) { // for every third loop, make the changes to the set of 3 position values x, y, z
  const x = array[i];
  const y = array[i + 1];
  const z = array[i + 2];

  array[i + 2] = z + (Math.random() - 0.5) * 3; // increase the Z value randomly to create a jagged effect
  array[i] = x + (Math.random() - 0.5) * 3; // subtracting 0.5 allows values to be negative (-0.5 to 0.5)
  array[i + 1] = y + (Math.random() - 0.5) * 3; // multiplying by 3 just increases how drastic the differences are
  }

  randomValues.push(Math.random() - 0.5); // add actual random values to array
}

planeMesh.geometry.attributes.position.randomValues = randomValues; // add the random values to the position array of the mesh vertices

planeMesh.geometry.attributes.position.originalPosition = planeMesh.geometry.attributes.position.array; // creates new array from position array for later


// color attribute addition
const colors = [];
for (let i = 0; i < planeMesh.geometry.attributes.position.count; i++) { //go through all vertices to add colors
  colors.push(0,0.4,0.19); // makes every vertex blue (interferes with color defined on planeMaterial above ^)
}

planeMesh.geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(colors), 3)) // create color attribute with 3 values (RGB)
planeMesh.rotation.x = -Math.PI / 4; // rotate ground body by 45 deg

planeMesh.castShadow = false;
planeMesh.receiveShadow = true;

var planeObjects = []; // just testing if these two lines can fix the raycasting issue
planeObjects.push(planeMesh);

scene.add(planeMesh); // add the object (the mesh) to the scene



const mouse = {
  x: undefined,
  y: undefined,
}

var coneMeshes = []; // array for all meshes of cones
var coneBodies = []; // array for all bodies of cones
var signMeshes = []; // array for all meshes of signs
var signBodies = []; // array for all bodies of signs

const objMat = new CANNON.Material(); // material that will allow interaction with plane
const groundMat = new CANNON.Material(); // material that will allow interaction with objects
const bulldozerMat = new CANNON.Material(); // material that will allow interaction with bulldozer

let objloaderNew = new GLTFLoader(); // initiate the object loader

for (let j = 0; j < 20; j++) { // make 40 of these
  objloaderNew.load('Cone4.glb', (glb) => { // gets the model file
    glb.scene.traverse(c => { // tell it to cast a shadow
        c.castShadow = true;
    });
    let coneScene = glb.scene;
    let box = new THREE.Box3().setFromObject(coneScene.children[0]); // find the bounding box of model
    coneScene.children[0].position.sub(box.getCenter(new THREE.Vector3())); // finds the center of the mesh
    coneScene.children[0].position.set(-100, -100, -100); // sets the position on load to be behind the ground
    scene.add(coneScene);
    coneMeshes[j] = coneScene.children[0];

    let coneBody = new CANNON.Body({ // create cone's body
      mass: 10,
      position: new CANNON.Vec3(Math.random() * (100+100) - 100, 100, -70), // place the cone randomly
      shape: new CANNON.Cylinder(0.1, 1, 2, 6),
      material: objMat // use the material that will allow interactions with plane
    });
    coneBody.quaternion.setFromEuler(Math.random() * ((Math.PI / 4)+(Math.PI / 4)) - (Math.PI / 4), 0, 0);
    coneBody.linearDampening = .5; // add dampening to linear movement (air resistance)
    physicsWorld.addBody(coneBody); // add the box to the world
    coneBodies[j] = coneBody;
  }
)

objloaderNew.load('ConstructionSign.glb', (glb) => { // gets the model file
  glb.scene.traverse(c => { // tell it to cast a shadow
      c.castShadow = true;
  });
  let signScene = glb.scene;
  let box = new THREE.Box3().setFromObject(signScene); // find the bounding box of model
  signScene.position.sub(box.getCenter(new THREE.Vector3()));
  signScene.children[0].position.set(-100, -100, -100);
  scene.add(signScene);
  signMeshes[j] = signScene.children[0];

  let signBody = new CANNON.Body({ // create cone's body
    mass: 10,
    position: new CANNON.Vec3(Math.random() * (50+50) - 50, 100, -70), // place the sign randomly
    shape: new CANNON.Box(new CANNON.Vec3(1.5, 2, .5)),
    material: objMat // use the material that will allow interactions with plane
  });
  signBody.quaternion.setFromEuler(Math.random() * ((Math.PI / 4)+(Math.PI / 4)) - (Math.PI / 4), 0, 0);
  signBody.linearDampening = .5; // add dampening to linear movement (air resistance)
  physicsWorld.addBody(signBody); // add the box to the world
  signBodies[j] = signBody; // adds the body to the array to grab from later
}
)
}

var bulldozerMesh; // create the variable of the cone mesh out here to redefine it later
objloaderNew.load('Bulldozer.glb', (glb) => { // gets the model file
  glb.scene.traverse(c => { // tell it to cast a shadow
      c.castShadow = true;
  });
  let bulldozerScene = glb.scene;
  let box = new THREE.Box3().setFromObject(bulldozerScene); // find the bounding box of model
  bulldozerScene.position.sub(box.getCenter(new THREE.Vector3()));
  bulldozerScene.children[0].position.set(-100, -100, -100);
  scene.add(bulldozerScene);

  bulldozerMesh = bulldozerScene.children[0];
}
)

const physicsWorld = new CANNON.World({ // create world that has gravity
  gravity: new CANNON.Vec3(0, -9.81, 0)
});

let bulldozerBody = new CANNON.Body({ // create cone's body
  mass: 0.3,
  position: new CANNON.Vec3(0, 800, 25), // place the sign randomly
  shape: new CANNON.Box(new CANNON.Vec3(20, 9, 8)),
  restitution: 0,
  material: bulldozerMat
});
bulldozerBody.linearDampening = 2; // add dampening to linear movement (air resistance)
physicsWorld.addBody(bulldozerBody); // add the box to the world

var coneMesh; // create the variable of the cone mesh out here to redefine it later
let objloader = new GLTFLoader(); // initiate the object loader
objloader.load('Cone4.glb', (glb) => { // gets the model file
    glb.scene.traverse(c => { // tell it to cast a shadow
        c.castShadow = true;
    });
    let box = new THREE.Box3().setFromObject(glb.scene); // find the bounding box of model
    glb.scene.children[0].position.sub(box.getCenter(new THREE.Vector3())); // set the mesh to have the same center as model bounding box
    //glb.scene.scale.set(2, 2, 2);
    let size = box.getSize(new THREE.Vector3( ));
    let boxCenter = box.getCenter(new THREE.Vector3());
    //glb.scene.position.x += ( glb.scene.position.x - boxCenter.x );
    //glb.scene.position.y += ( glb.scene.position.y - boxCenter.y );
    //glb.scene.position.z += ( glb.scene.position.z - boxCenter.z );
    //glb.scene.position.set( -boxCenter.x, size.y / 2 - boxCenter.y, -boxCenter.z );
    //console.log(boxCenter);

    scene.add(glb.scene); // add the item to the scene (changes depending on type of model)

    coneMesh = glb.scene.children[0]; // set the mesh variable to be the mesh of the imported model
})

const groundBody = new CANNON.Body({ // create ground body with static plane
  type: CANNON.Body.STATIC,
  position: new CANNON.Vec3(0, 1, 0),
  shape: new CANNON.Plane(), // infinite geometric plane
  material: groundMat // use the material that allows interactions with objects
});

groundBody.quaternion.setFromEuler(-Math.PI / 4, 0, 0); // rotate ground body by 45 deg
physicsWorld.addBody(groundBody);

const planeObjContactMat = new CANNON.ContactMaterial(
  objMat,
  groundMat,
  {friction: 0.001}
);

physicsWorld.addContactMaterial(planeObjContactMat);

const coneBody = new CANNON.Body({ // create cone's body
  mass: 10,
  position: new CANNON.Vec3(10, 100, -70),
  shape: new CANNON.Cylinder(0.5, 1, 2, 6)
});
coneBody.linearDampening = .5; // add dampening to linear movement (air resistance)
physicsWorld.addBody(coneBody); // add the box to the world

const platformBox = new THREE.BoxGeometry(150, 2, 50);
const platformMaterial = new THREE.MeshPhongMaterial({ // defines what the plane looks like
  color: 0xD3D3D3,
  flatShading: true // helps with lighting on slopes/edges
  //vertexColors: true // say that we want to use colors for vertices
});
const platformMesh = new THREE.Mesh(platformBox, platformMaterial);
platformMesh.position.set(0, -5, 20);
platformMesh.receiveShadow = true;
scene.add(platformMesh);

const platformBody = new CANNON.Body({ // create platform body
  mass: 0,
  position: new CANNON.Vec3(0, -5, 20),
  shape: new CANNON.Box(new CANNON.Vec3(100, 2, 30))
});
physicsWorld.addBody(platformBody); // add the platform to the world

const frontWallBody = new CANNON.Body({ // create platform body
  mass: 0,
  position: new CANNON.Vec3(0, -10, 40),
  shape: new CANNON.Box(new CANNON.Vec3(100, 100, 2))
});
physicsWorld.addBody(frontWallBody); // add the platform to the world

const rightWallBody = new CANNON.Body({ // create platform body
  mass: 0,
  position: new CANNON.Vec3(50, -10, 40),
  shape: new CANNON.Box(new CANNON.Vec3(2, 400, 400))
});
rightWallBody.quaternion.setFromEuler(0, -Math.PI / 6, 0); // rotate ground body by 30 deg
physicsWorld.addBody(rightWallBody); // add the platform to the world

const leftWallBody = new CANNON.Body({ // create platform body
  mass: 0,
  position: new CANNON.Vec3(-50, -10, 40),
  shape: new CANNON.Box(new CANNON.Vec3(2, 400, 400))
});
leftWallBody.quaternion.setFromEuler(0, Math.PI / 6, 0); // rotate ground body by 45 deg
physicsWorld.addBody(leftWallBody); // add the platform to the world

let frame = 0; // for counting frames for x and y movement on cos function

const Debugger = new CannonDebugger(scene, physicsWorld, { }); // initiate debugging and adding green grid to every object

function animate() { // animate the plane/mesh
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  //planeMesh.rotation.z += 0.01; // rotate the plane
  physicsWorld.fixedStep();
  //Debugger.update(); // make sure physics debugger is updating
  coneMesh.position.copy(coneBody.position);
  coneMesh.quaternion.copy(coneBody.quaternion);
  //console.log(coneMesh.position);
  //console.log(coneBody.position);

  for (let j = 0; j < 20; j++) {
    coneMeshes[j].position.copy(coneBodies[j].position);
    coneMeshes[j].quaternion.copy(coneBodies[j].quaternion);
    
    signMeshes[j].position.copy(signBodies[j].position);
    signMeshes[j].quaternion.copy(signBodies[j].quaternion);
  }

  bulldozerMesh.position.copy(bulldozerBody.position);
  bulldozerMesh.quaternion.copy(bulldozerBody.quaternion);

  if (bulldozerBody.velocity.y > 0) { // stops the bouncing
    bulldozerBody.velocity.y = 0;
  }

  frame += 0.01; // adds a small amount to be entered into cos function for incremental movement

  const { array, originalPosition, randomValues } = planeMesh.geometry.attributes.position; // pull in values stored as part of geometry position
  for (let i = 0; i < array.length; i+=3) {
    array[i] = originalPosition[i] + Math.cos(frame + randomValues[i]) * 0.005; // x value changing with cos function
    array[i + 1] = originalPosition[i + 1] + Math.sin(frame + randomValues[i + 1]) * 0.005; // y value changing with sin function
  }

  planeMesh.geometry.attributes.position.needsUpdate = true; // continuously updating

  raycaster.setFromCamera(mouse, camera); // ray caster is pointed from camera through cursor

  var intersects = raycaster.intersectObject(planeMesh); // creates object as mouse goes over specific object
  if (intersects.length > 0) {
    //console.log(intersects[0]); // gives you back the vertices that make up the face you're pointing at
    const {color} = intersects[0].object.geometry.attributes;
    color.setX(intersects[0].face.a, 0.1); // target 'a' (first vertex) of target face to black (0)
    color.setY(intersects[0].face.a, 1); // target the G value of RGB to 1
    color.setZ(intersects[0].face.a, 0.5);
    color.setX(intersects[0].face.b, 0.1);
    color.setY(intersects[0].face.b, 1);
    color.setZ(intersects[0].face.b, 0.5);
    color.setX(intersects[0].face.c, 0.1);
    color.setY(intersects[0].face.c, 1);
    color.setZ(intersects[0].face.c, 0.5);

    intersects[0].object.geometry.attributes.color.needsUpdate = true; // needs to know that data changed and has to update

    const initialColor = { // creating an initial color for animation
      r: 0,
      g: 0.4,
      b: 0.19
    }

    const hoverColor = { // add color that vertices turn when hovering cursor
      r: 0.1,
      g: 1,
      b: 0.5
    }

    gsap.to(hoverColor, { // now that cursor changes color of vertices to hoverColor, this changes from hoverColor back to initial Color
      r: initialColor.r, // changes hoverColor r value to initialColor r value
      g: initialColor.g,
      b: initialColor.b,
      duration: 1, // time it takes to for this to happen (fading)
      onUpdate: () => { // makes sure that updating happens
        color.setX(intersects[0].face.a, hoverColor.r); // target 'a' (first vertex) of target face to black (0)
        color.setY(intersects[0].face.a, hoverColor.g); // target the G value of RGB to 1
        color.setZ(intersects[0].face.a, hoverColor.b);
        color.setX(intersects[0].face.b, hoverColor.r);
        color.setY(intersects[0].face.b, hoverColor.g);
        color.setZ(intersects[0].face.b, hoverColor.b);
        color.setX(intersects[0].face.c, hoverColor.r);
        color.setY(intersects[0].face.c, hoverColor.g);
        color.setZ(intersects[0].face.c, hoverColor.b);
        color.needsUpdate = true;
      }
    })
  }
}


addEventListener('mousemove',(event) => {
  //console.log(event.clientX)
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = (event.clientY / innerHeight) * -2 + 1;
})

animate()
