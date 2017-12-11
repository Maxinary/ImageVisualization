var drawings = [];//the list of things being drawn

function squared(x){return x*x;}

function shuffle(arr){
  for(var i=0;i<arr.length;i++){
    var ind = Math.floor(Math.random()*arr.length);
    var temp = arr[i];
    arr[i] = arr[ind];
    arr[ind] = temp;
  }
  return arr;
}

function dist(a, b){
	var sum = 0;
	for(var i=0; i<a.length && i<b.length; i++){
		sum += Math.pow(a[i]-b[i],2);
	}
	
	return Math.sqrt(sum);
}

function equals(a, b){
	return a == b;
}

function closeToEquals(distFn, closeness){
	return function(a,b){
		return distFn(a, b) <= closeness;
	}
}

function addToSet(a, set, equalsfunction){
	if(equalsfunction === undefined){
		equalsfunction = equals;
	}
	
	for(var i=0; i<set.length; i++){
		if(equalsfunction(set[i], a)){
			return false;

			console.log(i)
		}
	}
	set.push(a);
	return true;
}

//personal movement
var thetaX = 1;
var thetaY = -Math.PI*3/4;
var thetaZ = 0;
var cameraDistance = 2.5;

var move = [1,0];
var worldShift = [0, 0, 0];
var ballSpeed = [0, 0, 0];
var speed = 1/30;

class WorldState{
  constructor(drawings, keyReg, tickCode){
    this.drawings = drawings;
    this.keyReg = keyReg;
    this.tick = tickCode;
  }
}

var gameStates = {};
var curGameState = "run";

//final objects
var sphere;
var cube;
var plane;

var currentGameState;

var myDrawable = DrawableFactory([
    "vertexPositionBuffer", 
    "vertexIndexBuffer", 
  ]);

//code for actually drawing and running{

function addItemsToDrawables(colorRaw, numColorsPerAxis, minDist){
	drawings = [];
	{//boxes
		var colorList = [];
		{
			var eq = closeToEquals(dist,minDist);
			for(var i=0; i<colorRaw.length; i++){
				addToSet(colorRaw[i].map(x => Math.floor(x*numColorsPerAxis/255)*255/numColorsPerAxis), colorList, eq);
			}
		}
		console.log(colorList);

		for(var i=0; i<colorList.length; i++){
			var c = cube.copy().stretch([1/numColorsPerAxis,1/numColorsPerAxis,1/numColorsPerAxis]);
			c.coords = [colorList[i][0]/255, colorList[i][1]/255, colorList[i][2]/255];
			drawings.push(c);
		}
	}
	{//axes
		drawings.push(cube.copy().stretch([1/64,1/64,1]));
		drawings.push(cube.copy().stretch([1/64,1,1/64]));
		drawings.push(cube.copy().stretch([1,1/64,1/64]));
	}
	  
	// go through drawings and generate all their buffers
	for(var ii=0; ii<drawings.length; ii++){
		gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(drawings[ii].shadeAttribs.vertexPositionBuffer), gl.STATIC_DRAW);
		drawings[ii].shadeObjs.vertexPositionBuffer.itemSize = 3;
		drawings[ii].shadeObjs.vertexPositionBuffer.numItems = drawings[ii].shadeAttribs.vertexPositionBuffer.length/3;

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(drawings[ii].shadeAttribs.vertexIndexBuffer), gl.STATIC_DRAW);
		drawings[ii].shadeObjs.vertexIndexBuffer.itemSize = 1;
		drawings[ii].shadeObjs.vertexIndexBuffer.numItems = drawings[ii].shadeAttribs.vertexIndexBuffer.length;
	}

	console.log(drawings);
}
function tick(){
  requestAnimationFrame(tick);//register next tick
  
  gameStates[curGameState].tick();
  
  //check keys and values from keyRegisterer.js
  gameStates[curGameState].keyReg.keyTick();
  
  //draw
  {
    //clear screen
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0, 0, 0, 0.3);
  
    //set up view model
    mat4.perspective(pMatrix, Math.PI/4, gl.viewportWidth / gl.viewportHeight, 1.0, 100.0);
  
    mat4.identity(mvMatrix);
  
    //intial camera movement
  
    mat4.translate(mvMatrix, mvMatrix, [0,0,-5]);//got sphere
  
    mat4.lookAt(mvMatrix, worldShift, [0.5,0.5,0.5], vec3.fromValues(0, 1, 0))
  
  
    //loop through drawings and draw
    for(var ii=0;ii<drawings.length;ii++){
      mvPushMatrix();
  	
  	  var rotationMatrix = mat4.create();
  	
      mat4.rotate(rotationMatrix, rotationMatrix, drawings[ii].rotation[0], [1, 0, 0]);
      mat4.rotate(rotationMatrix, rotationMatrix, drawings[ii].rotation[1], [0, 1, 0]);
      mat4.rotate(rotationMatrix, rotationMatrix, drawings[ii].rotation[2], [0, 0, 1]);
  
      mat4.translate(mvMatrix,  mvMatrix, drawings[ii].coords);

	  mat4.identity(uNMatrix);
//	  mat4.scale(uNMatrix,  uNMatrix, drawings[ii].stretchRegister);

      mat4.translate(uNMatrix,  uNMatrix, drawings[ii].coords);
  
      //vertices
      gl.bindBuffer(gl.ARRAY_BUFFER, drawings[ii].shadeObjs.vertexPositionBuffer);
      gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, drawings[ii].shadeObjs.vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0); 
  
      //vertex index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, drawings[ii].shadeObjs.vertexIndexBuffer);
  
      setMatrixUniforms(rotationMatrix);
      gl.drawElements(drawings[ii].drawMod, drawings[ii].shadeObjs.vertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
  
      mvPopMatrix();
    }
  }
}

function webGLStart() {
  //init GL
  initGL();
  
  //init shaders
  //so those vars fragmentShader and vertexShader get removed later
  initShaders();
  
  
  //init buffers
  {    
    //cube init
    {
      cube = myDrawable.new();
    
      
      cube.shadeAttribs.vertexIndexBuffer = [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7, 8, 9, 10, 10, 9, 11, 12, 13, 14, 14, 13, 15, 16, 17, 18, 18, 17, 19, 20, 21, 22, 22, 21, 23];
      cube.shadeAttribs.vertexPositionBuffer = [0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1];
    }
    ///end cube init
    
    //plane init 
    {
      plane = myDrawable.new();
      
      var width = 20;
      var indecies = 4;
      for(var i=0;i<width;i++){
        for(var j=0;j<width;j++){
          plane.shadeAttribs.vertexPositionBuffer = plane.shadeAttribs.vertexPositionBuffer.concat([
            i, 0, j,
            i+1, 0, j,
            i, 0, j+1,
            i+1, 0, j+1
          ]);
          
          plane.shadeAttribs.vertexIndexBuffer = plane.shadeAttribs.vertexIndexBuffer.concat([
            indecies*(i*width+j), indecies*(i*width+j)+2, indecies*(i*width+j)+1,
            indecies*(i*width+j)+1, indecies*(i*width+j)+2, indecies*(i*width+j)+3
          ]);
        }
      }
    }
    //end plane init
  }
    
  //add some items to the drawables
  addItemsToDrawables(constLightColors,12, 0);


  //initialize the playtime game state
  {
    var gameKeys = new KeyRegister();
    {
      //rotate
      gameKeys.registerKeyPress(buttonMove.hold, 37, function(){thetaY-=0.02;});
      gameKeys.registerKeyPress(buttonMove.hold, 38, function(){thetaX-=0.02;});
      gameKeys.registerKeyPress(buttonMove.hold, 39, function(){thetaY+=0.02;});
      gameKeys.registerKeyPress(buttonMove.hold, 40, function(){thetaX+=0.02;});
    
      //S
      gameKeys.registerKeyPress(buttonMove.hold, 83, function(){
        drawings[0].velocity[0]+=speed*Math.sin(thetaY);
        drawings[0].velocity[2]+=speed*Math.cos(thetaY);
      });
  
      //W
      gameKeys.registerKeyPress(buttonMove.hold, 87, function(){
        drawings[0].velocity[0]-=speed*Math.sin(thetaY);
        drawings[0].velocity[2]-=speed*Math.cos(thetaY);
      });
  
      //A
      gameKeys.registerKeyPress(buttonMove.hold, 65, function(){
        drawings[0].velocity[0]-=speed*Math.cos(thetaY);
        drawings[0].velocity[2]+=speed*Math.sin(thetaY);
      });
  
      //D
      gameKeys.registerKeyPress(buttonMove.hold, 68, function(){
        drawings[0].velocity[0]+=speed*Math.cos(thetaY);
        drawings[0].velocity[2]-=speed*Math.sin(thetaY);
      });
    }
    
    gameKeys.engage();
    
    gameStates["run"] = new WorldState(drawings, gameKeys, function(){
      //set current rotation
      {
        for(var i=0; i<3; i++){
          worldShift[i] = 0.5;
        }
        worldShift[0] +=  cameraDistance*Math.sin(thetaX)*Math.sin(thetaY);//yRot math
        worldShift[1] +=  cameraDistance*Math.cos(thetaX);//zRot math
        worldShift[2] +=  cameraDistance*Math.sin(thetaX)*Math.cos(thetaY);//xRot math
      }
    });
  }

  //gl variables
  {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
  
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }


  //begin tick cycle
  tick();
}
//}end code for drawing
