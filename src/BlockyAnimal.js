// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
//Assignment notes to grader:Notes to grader: Most code based off of Professor's walkthrough videos. ChatGPT helped me debug, get unstuck with my code, and learn new stuff for my code. I made comments in my code indicating where it was used. Also recieved small help from course tutor. I also borrowed a few lines of code from: https://people.ucsc.edu/~jrgu/asg2/blockyAnimal/BlockyAnimal.js to learn how to get a shift-click input to work (I indicated in code comments where it was used). 

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() { 
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`
//where pointsize changes the size of the squares.


// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

//Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST); //Depth buffer will keep track of whats in front of something else.

}

function connectVariablesToGLSL(){

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix){
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix){
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  // Set an initial value for this matrix to identify
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

// Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;


// Globals related to UI elements
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedSize = 5;
let g_selectedType=POINT;
let g_globalAngle = 0;
let g_globalAngleY = 0;
let g_yellowAngle = 0;
let g_yellowAngleRight = 0;
let g_left_footangle = 0;
let g_midLegAngle = 0;   //Chat gpt helped me debug my slider control for a second level joint (I originally had but got rid of and couldn't get it to work anymore when I tried implementing again). So it suggested me to add this line of code
let g_yellowAnimation=false;  //Always start without animation when starting up
let mouse_x = 0;
let mouse_y = 0;
let g_wattleAnimation = false;
let g_wattleAnimationrock = 0;
//let g_selectedSegment = 3;

function addActionForHTMLUI(){
  //Button Events
  document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation=false;};
  document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation=true;};

  //Size Slider Events (chat gpt helped me fix this function, for some reason the professor's code was 
  // causing the program to draw when I simply just hovered my mouse over the slider, which I don't want)
  document.getElementById('angleSlide').addEventListener('input', function() {
    g_globalAngle = this.value; 
    renderAllShapes(); 
  });  //calls renderallshapes everytime the slider moves dynamically. Updates happen on the current state of the world.

//Chat gpt helped me debug my slider control for a second level joint (I originally had but got rid of and couldn't get it to work anymore when I tried implementing again). So it suggested me to add this line of code
  document.getElementById('angleSlideY').addEventListener('input', function() {
    g_globalAngleY = this.value; 
    renderAllShapes(); 
  });
  // Color Slider Events
  //document.getElementById('yellowSlide').addEventListener('input', function() {g_yellowAngle = this.value; renderAllShapes();});

  document.getElementById('yellowSlideRight').addEventListener('input', function() {g_yellowAngleRight = this.value; renderAllShapes();});


  document.getElementById('left_foot_Slide').addEventListener('input', function() {g_left_footangle = this.value; renderAllShapes();});

  //Chat gpt helped me debug my slider control for a second level joint (I originally had but got rid of and couldn't get it to work anymore when I tried implementing again). So it suggested me to add this snippet of code
  document.getElementById('midLegSlider').addEventListener('input', function() {
    // Update the rotation angle of the mid left leg and the foot
    g_midLegAngle = this.value;
    // Render all shapes with updated rotation angle
    renderAllShapes();
});

// Mouse control to rotate canvas(CHATGPT helped me with this):
canvas.addEventListener('mousedown', function(ev) {
  // Event listener for mouse move to handle rotation while dragging on canvas
  canvas.addEventListener('mousemove', mouseMoveHandler);
});

// handle mouse move for rotation of canvas(CHATGPT helped me with this):
function mouseMoveHandler(ev) {
  // Calculate movement delta
  let X = ev.clientX - mouse_x;
  let Y = ev.clientY - mouse_y;
  
  // Update rotation angles based on mouse movement
  g_globalAngle += X * 1; // Sensitivity of 1 to make it fast
  g_globalAngleY += Y * 1;
  
  // Store intermediate mouse position
  mouse_x = ev.clientX;
  mouse_y = ev.clientY;
  
  // Render shapes with updated rotation angles
  renderAllShapes(); //professor's code
}

// Function to handle mouse up event (rotate canvas) (CHATGPT helped me with this):
canvas.addEventListener('mouseup', function(ev) {
  // Remove the mouse move event listener when mouse is released
  canvas.removeEventListener('mousemove', mouseMoveHandler);
});
}

function main() {

  setupWebGL();
  connectVariablesToGLSL();

  addActionForHTMLUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function (ev) { if(ev.buttons == 1) {click(ev) } };  //drag and move mouse on canvas

  // Specify the color for clearing <canvas>
  gl.clearColor(0.7, 0.85, 0.95, 1.0); //Chatgpt helped me calculate a good color for my background to allow the shadows to appear nicely (baby blue)

  // Register function (event handler) to be called on a mouse press
  //Code borrowed and learned from: https://people.ucsc.edu/~jrgu/asg2/blockyAnimal/BlockyAnimal.js
  canvas.onclick = function(ev) {if(ev.shiftKey) {if (g_wattleAnimation){g_wattleAnimation = false} g_wattleAnimation = true}}
  canvas.onmousedown = origin;
  canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev) } };

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); //clears the color and the depths (Rohan the course tutor helped me with this line of code)

  //renderAllShapes();
  requestAnimationFrame(tick);
}

//var g_shapesList = [];

//  var g_points = [];  // The array for the position of a mouse press
//  var g_colors = [1.0, 1.0, 1.0, 1.0];  // The array to store the color of a point
//  var g_sizes = [];

// Keep track of startime when program starts and the seconds
var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now/1000.0-g_startTime;

//Called by the broswer repeatedly whenever its time
function tick(){
  // Save the current time
  g_seconds = performance.now()/120.0-g_startTime;
  //console.log(g_seconds);

  //Update Animation Angles
  updateAnimationAngles();

  // Draw everything
  renderAllShapes();

  // Tell the browser to update again when it has time
  requestAnimationFrame(tick);
}


function click(ev) {
  //Extract the event click and return it in WebGL coordinates
  let [x, y] = convertCoordinatesEventToGL(ev); // grab the values of the click event and return it in WebGl coordinates.
  
  //Create and store the new point
  let point;
  if(g_selectedType==POINT){
    point = new Point();
  }
  else if (g_selectedType==TRIANGLE){
    point = new Triangle();
  }
  else if (g_selectedType==CIRCLE){
    point = new Circle();
    // Set the segments property of the circle
    point.segments = g_selectedSegment;  //chat gpt helped me come up with this line of code, I was stuck debugging part 11 but it helped me come up with this code.
  }

  point.position=[x,y];
  point.color=g_selectedColor.slice();
  point.size=g_selectedSize;
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
  
}

function updateAnimationAngles(){ //put all of the different angles that we are going to move with the on/off button here
  if (g_yellowAnimation){                             //g_yellowAnimation is currently being used to animate all of the objects
    g_yellowAngle = (-34*Math.sin(g_seconds));        //ChatGPT helped me figure out the math for the angle rotations for the animations
  }
  if(g_yellowAnimation){
    g_yellowAngleRight = (34*Math.sin(g_seconds));
  }
  if(g_wattleAnimation){
    g_wattleAnimationrock = (-34 * Math.sin(g_seconds));
  }
}

function renderAllShapes(){

  var startTime = performance.now();

  //Pass the matrix to u_ModelMatrix attribute
  var globalRotMat=new Matrix4().rotate(g_globalAngle,0,1,0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  //Pass the matrix to u_ModelMatrix attribute (ChatGPT helped me create this y-axis slider part)
  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0).rotate(g_globalAngleY, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);


  // Clear <canvas>  (rendering points)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 

  //Draw Chicken Body
  var body = new Cube();
  body.color = [0.6, 0.4, 0.8, 1.0];
  body.matrix.scale(0.6,0.6,0.6);
  body.render();

  // Left Wing
  var left_wing = new Cube();
  left_wing.color = [0.6, 0.4, 0.8, 1.0];
  left_wing.matrix.translate(0.0, 0.10, -0.35)
  left_wing.matrix.scale(0.5, 0.4, -0.10)
  left_wing.render();

  //Right Wing
  var right_wing = new Cube();
  right_wing.color = [0.6, 0.4, 0.8, 1.0];
  right_wing.matrix.translate(0.0, 0.10, 0.35);
  right_wing.matrix.scale(0.5, 0.4, 0.10); 
  right_wing.render();
  
  //Head
  var head = new Cube();
  head.color = [0.6, 0.4, 0.8, 1.0];
  head.matrix.translate(-0.35, 0.3, 0.0);
  head.matrix.scale(0.25, 0.5, 0.5); 
  head.render();

  //beak
  var beak = new Cube();
  beak.color = [1, 1, 0.0, 1.0];
  beak.matrix.translate(-0.57, 0.3, 0);
  beak.matrix.scale(0.20, 0.20, 0.5); 
  beak.render();

  //Wattle (red part)
  var wattle = new Cube();
  wattle.color = [1.0, 0.0, 0.0, 1.0];
  wattle.matrix.translate(-0.52, 0.20, -0.001)
  wattle.matrix.rotate(g_wattleAnimationrock, 1, 0, 0);
  wattle.matrix.scale(0.10, 0.28, 0.2); 
  wattle.render();


  //left eye
  var left_eye = new Cube();
  left_eye.color = [0.0, 0.0, 0.0, 1.0];
  left_eye.matrix.translate(-0.52001, 0.45, 0.20);
  left_eye.matrix.scale(0.1, 0.1, 0.10);
  left_eye.render();
  
  //Right Eye
  var right_eye = new Cube();
  right_eye.color = [0.0, 0.0, 0.0, 1.0];
  right_eye.matrix.translate(-0.52001, 0.45, -0.20);
  right_eye.matrix.scale(0.1, 0.1, 0.10);
  right_eye.render();

  //upper left leg
  var upper_leg1 = new Cube();
  upper_leg1.color = [0.6, 0.4, 0.8, 1.0];
  upper_leg1.matrix.translate(0, -0.25, -0.15)
  upper_leg1.matrix.rotate(g_yellowAngle, 0, 0, 1);  // Rotate around the z-axis
  upper_leg1.matrix.scale(0.31,0.15,0.13);
  upper_leg1.render();

  //upper right leg
  var upper_leg2 = new Cube();
  upper_leg2.color = [0.6, 0.4, 0.8, 1.0];
  upper_leg2.matrix.translate(0, -0.25, 0.15)
  upper_leg2.matrix.rotate(g_yellowAngleRight, 0, 0, 1);  // Rotate around the z-axis
  upper_leg2.matrix.scale(0.31,0.15,0.13);
  upper_leg2.render();

  // mid left leg
  var mid_leg1 = new Cube();
  mid_leg1.color = [1, 1, 0.0, 1.0];
  mid_leg1.matrix.translate(0, -0.45, -0.15); // Translate to the base of the leg
  mid_leg1.matrix.rotate(g_yellowAngle, 0, 0, 1);  // Rotate around the z-axis
  mid_leg1.matrix.rotate(g_midLegAngle, 0, 0, 1);  // Rotate the mid leg //Chat gpt helped me debug my slider control for a second level joint (I originally had but got rid of and couldn't get it to work anymore when I tried implementing again). So it suggested me to add this snippet of code
  var left_foot_coordMat = new Matrix4(mid_leg1.matrix); //Debugged chat gpt suggested code
  mid_leg1.matrix.scale(0.08,0.5,0.08);
  mid_leg1.render();


  // //mid right leg
  var mid_leg2 = new Cube();
  mid_leg2.color = [1, 1, 0.0, 1.0];
  mid_leg2.matrix.translate(0, -0.45, 0.15)
  //mid_leg2.matrix.rotate(-g_yellowAngleRight, 0, 0, 1);  // Rotate around the z-axis
  mid_leg2.matrix.rotate(g_yellowAngleRight, 0, 0, 1);  // Rotate around the z-axis
  var right_foot_coordMat = new Matrix4(mid_leg2.matrix);
  mid_leg2.matrix.scale(0.08,0.5,0.08);
  mid_leg2.render();

  // left foot
  var left_foot = new Cube();
  left_foot.color = [1, 1, 0.0, 1.0];
  left_foot.matrix = left_foot_coordMat;   //Chat gpt helped me debug my slider control for a second level joint (I originally had but got rid of and couldn't get it to work anymore when I tried implementing again). So it suggested me to add this snippet of code
  left_foot.matrix.translate(0.0, -0.45, 0)
  left_foot.matrix.rotate(g_left_footangle, 0, 1, 0);   //Chat gpt helped me debug my slider control for a second level joint (I originally had but got rid of and couldn't get it to work anymore when I tried implementing again). So it suggested me to add this snippet of code
  left_foot.matrix.scale(0.2,0.10,0.2);
  left_foot.matrix.translate(-0.3, 1.5, 0)
  left_foot.render();


  //right foot
  var right_foot = new Cube();
  right_foot.color = [1, 1, 0.0, 1.0];
  right_foot.matrix = right_foot_coordMat;
  right_foot.matrix.translate(0.0, -0.45, 0.0)
  right_foot.matrix.scale(0.2,0.10,0.2);
  right_foot.matrix.translate(-0.3, 1.5, 0)
  // right_foot.matrix.scale(0.2,0.10,0.2);
  right_foot.render();

  // //Party hat!!
   var hat = new Pyramid();
   hat.color = [1.0, 0.0, 0.5, 1.0];
   hat.matrix.translate(-0.35, 0.65, 0.0);
   hat.matrix.scale(0.2, 0.2, 0.2);
   hat.render();

//Prof's drawing
  // //Draw a cube (red one)
  // var body = new Cube();
  // body.color = [1.0, 0.0, 0.0, 1.0];
  // body.matrix.translate(-0.25, -0.75, 0.0);
  // body.matrix.rotate(-5,1,0,0);
  // body.matrix.scale(0.5, 0.3, 0.5);         //this one happens first! Right to left matrix multiplication
  // body.render();

  // // Draw a yellow left arm
  // var leftArm = new Cube();
  // leftArm.color = [1,1,0,1];
  // leftArm.matrix.setTranslate(0,-0.5,0.0);
  // leftArm.matrix.rotate(-5, 1, 0, 0);
  // // leftArm.matrix.rotate(-g_yellowAngle, 0, 0, 1);  //2.6: rotate the yellow joint
  // leftArm.matrix.rotate(-g_yellowAngle, 0, 0, 1);  //2.6: rotate the yellow joint
  // var yellowCoordinatesMat = new Matrix4(leftArm.matrix);
  // leftArm.matrix.scale(0.25, 0.7, 0.5);
  // leftArm.matrix.translate(-0.5, 0, 0);
  // leftArm.render();

  // //Test box (pink box)
  // var box = new Cube();
  // box.color = [1,0,1,1];
  // box.matrix = yellowCoordinatesMat;
  // box.matrix.translate(0,0.65,0.0,0);
  // box.matrix.rotate(g_magentaAngle, 0, 0, 1);
  // box.matrix.scale(0.3, 0.3, 0.3);
  // box.matrix.translate(-0.5,0,-0.001);
  // box.render();

  //Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");
}

// Set the text of a HTML element
function sendTextToHTML(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}