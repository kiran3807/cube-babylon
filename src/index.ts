import { 
    Engine, MeshBuilder, ArcRotateCamera, HemisphericLight,
    Scene, Vector3, Color3, Color4, AbstractMesh, FreeCamera, ActionManager,
    InterpolateValueAction, Mesh, StandardMaterial, ExecuteCodeAction, MultiMaterial, 
    SubMesh, Matrix, VertexData,
    PickingInfo, IPointerEvent, VertexBuffer
} from 'babylonjs';

import { addLabelToMesh } from "./gui";
import { getPositionVectorFrom2D, getVertextDisplacementVector } from "./utils";

let canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
let engine = new Engine(canvas, true);


function createCube(scene: Scene) {

    let cube = MeshBuilder.CreateBox("cube", {size: 1, updatable : true}, scene);
    let newMaterial = new StandardMaterial(`material-demo`, scene);
    newMaterial.diffuseColor = new Color3(0.1,0.2,0.3);
    newMaterial.wireframe = true;
    cube.material = newMaterial;

    //cube.actionManager = new ActionManager(scene);
    //cube.enablePointerMoveEvents = true;

    /*let cubeMaterials = new MultiMaterial("cubeMaterials", scene);
    let verticesCount = cube.getTotalVertices();
    cube.subMeshes = [];

    for(let i=0; i<6; i++) {
        let subMaterial = new StandardMaterial(`material-${i}`);
        subMaterial.diffuseColor = new Color3(1,0,0.75);
        cubeMaterials.subMaterials.push(subMaterial);
        cube.subMeshes.push(new SubMesh(i, i, verticesCount, (0 + i*6), 6, cube));
    }
    cube.material = cubeMaterials;

    let materialHighlight = new StandardMaterial("material-highlight");
    materialHighlight.diffuseColor = new Color3(0.25,0.75,0.35);
    cubeMaterials.subMaterials.push(materialHighlight);

    let materialExtrusionHighlight = new StandardMaterial("material-extrusion-highlight");
    materialHighlight.diffuseColor = new Color3(0.3,0.8,0.4);
    cubeMaterials.subMaterials.push(materialExtrusionHighlight);*/

    // scroll highlight code
    /*let subMeshMaterialIndexesArray = new Array<any>();
    cube.subMeshes.forEach((subMesh, index)=> {
        subMeshMaterialIndexesArray[index] = [subMesh.materialIndex, 6];
    });*/

    let isDragEnabled = false;
    let dragStartVector = Vector3.Zero();
    let dragStartNormalVector = Vector3.Zero();
    let dragFaceId: number;

    scene.onPointerMove = (event, pickInfo) => {

        function setMaterial(materialIndex: number, subMeshIndex: number) {
            cube.subMeshes[subMeshIndex].materialIndex = materialIndex;
        }
        
        if(pickInfo.hit && pickInfo.pickedMesh === cube) {

            if(!isDragEnabled) {

                /*setMaterial(subMeshMaterialIndexesArray[pickInfo.subMeshId][1], pickInfo.subMeshId);
                subMeshMaterialIndexesArray.forEach((el, index)=> {
                    if( index !== pickInfo.subMeshId && index !== (pickInfo.subMeshId+1)) {
                        setMaterial(el[0], index);
                    }
                });*/
            }
            
        } else {

            if(!isDragEnabled) {

                /*subMeshMaterialIndexesArray.forEach((el, index)=> {
                    setMaterial(el[0], index);
                });*/
            } else {

                console.log("on move");
                const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY, engine, scene);
                const vertexDisplacementVector = getVertextDisplacementVector(currentDragVector, dragStartVector, dragStartNormalVector);
            }
        }
    }


    scene.onPointerPick = function(event, pickInfo) {

        if(pickInfo.hit && pickInfo.pickedMesh === cube) {
        
            isDragEnabled = true;
            dragStartVector = pickInfo.pickedPoint!;
            dragStartNormalVector = pickInfo.getNormal(true, true)!;
            //cube.subMeshes[pickInfo.subMeshId].materialIndex = 7;
            dragFaceId = pickInfo.subMeshId;

            console.log("face normal vector: ", dragStartNormalVector.asArray());
        }
    }

    scene.onPointerDown = async function(event, pickInfo) {

        if(isDragEnabled && !pickInfo.hit) {
            
            console.log("on down");
            const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY, engine, scene);
            const vertexDisplacementVector = getVertextDisplacementVector(currentDragVector, dragStartVector, dragStartNormalVector);


            let cubeIndices = cube.getIndices();
            let cubePositions = cube.getVerticesData(VertexBuffer.PositionKind);

            let face = dragFaceId / 2;
            let facet = 2 * Math.floor(face);

            console.log(vertexDisplacementVector.asArray(), vertexDisplacementVector.length);

            console.log("before: ", structuredClone(cubePositions));
            new Set(cubeIndices!.slice(3 * facet, 3 * facet + 6)).forEach((vertexIndex)=> {

                cubePositions![3*vertexIndex] = cubePositions![3*vertexIndex] + vertexDisplacementVector.x;
                cubePositions![3*vertexIndex + 1 ] = cubePositions![3*vertexIndex + 1 ] + vertexDisplacementVector.y;
                cubePositions![3*vertexIndex + 2] = cubePositions![3*vertexIndex + 2] + vertexDisplacementVector.z;
            });

            console.log("after: ", cube.getVerticesData(VertexBuffer.PositionKind));

            cube.updateVerticesData(VertexBuffer.PositionKind, cubePositions!, true);
            isDragEnabled = false;

            let vertexData = new VertexData();

            // Set the updated positions and indices
            vertexData.positions = cubePositions!;
            vertexData.indices = cubeIndices;

            // Calculate normals
            vertexData.normals = [];

            VertexData.ComputeNormals(cubePositions!, cubeIndices, vertexData.normals);
            vertexData.applyToMesh(cube);

            cube.refreshBoundingInfo();
            
            //scene.render();
            //cube.computeWorldMatrix(true);

        } 
    }
    
    addLabelToMesh(cube);
}

function createScene(engine: Engine, canvas: HTMLCanvasElement) {

    let scene = new Scene(engine);

    let camera = new ArcRotateCamera("Camera", Math.PI/2, Math.PI/2, 2, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    let light = new HemisphericLight("light", new Vector3(1,0,0), scene);
    //light.groundColor = new Color3(1, 1, 1);
    //light.intensity = 0.5;
    
    createCube(scene);

    return scene;
}

let scene = createScene(engine, canvas);
engine.runRenderLoop(async ()=> {
    
    scene.render();

    let cube = scene.getMeshById("cube")
    if(!cube) {
        throw Error("cannot find the cube mesh");
    }
});

window.addEventListener("resize", function () {
    engine.resize();
});

