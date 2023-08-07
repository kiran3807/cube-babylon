import { 
    Engine, MeshBuilder, ArcRotateCamera, HemisphericLight,
    Scene, Vector3, Color3, Color4, AbstractMesh, FreeCamera, ActionManager,
    InterpolateValueAction, Mesh, StandardMaterial, ExecuteCodeAction, MultiMaterial, 
    SubMesh, Matrix, VertexData,
    PickingInfo, IPointerEvent, VertexBuffer
} from 'babylonjs';

import { 
    getPositionVectorFrom2D, getVertextDisplacementVector, extrudeMesh, DragManager,
    ExtrusionSimulatorManager
} from "./utils";

let canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
let engine = new Engine(canvas, true);


function createCube(scene: Scene) {

    let cube = MeshBuilder.CreateBox("cube", {size: 1, updatable : true}, scene);

    cube.enablePointerMoveEvents = true;
    cube.forceSharedVertices();

    let cubeMaterials = new MultiMaterial("cubeMaterials", scene);
    let verticesCount = cube.getTotalVertices();
    cube.subMeshes = [];

    for(let i=0; i<6; i++) {
        let subMaterial = new StandardMaterial(`material-${i}`);
        subMaterial.diffuseColor = new Color3(1,0,0.75);
        subMaterial.alpha = 0.4;
        cubeMaterials.subMaterials.push(subMaterial);
        cube.subMeshes.push(new SubMesh(i, i, verticesCount, (0 + i*6), 6, cube));
    }
    cube.material = cubeMaterials;

    let materialHighlight = new StandardMaterial("material-highlight");
    materialHighlight.diffuseColor = new Color3(0.25,0.75,0.35);
    materialHighlight.alpha = 0.4;
    cubeMaterials.subMaterials.push(materialHighlight);

    let materialExtrusionHighlight = new StandardMaterial("material-extrusion-highlight");
    materialHighlight.diffuseColor = new Color3(0.3,0.8,0.4);
    materialExtrusionHighlight.alpha = 0.4;
    cubeMaterials.subMaterials.push(materialExtrusionHighlight);

    // scroll highlight code
    let subMeshMaterialIndexesArray = new Array<any>();
    cube.subMeshes.forEach((subMesh, index)=> {
        subMeshMaterialIndexesArray[index] = [subMesh.materialIndex, 6];
    });

    const dragManager = new DragManager();
    const simulator = new ExtrusionSimulatorManager();

    scene.onPointerMove = (event, pickInfo) => {

        function setMaterial(materialIndex: number, subMeshIndex: number) {
            cube.subMeshes[subMeshIndex].materialIndex = materialIndex;
        }
        
        if(pickInfo.hit && pickInfo.pickedMesh === cube) {
            if(!dragManager.inDragState()) {
                setMaterial(subMeshMaterialIndexesArray[pickInfo.subMeshId][1], pickInfo.subMeshId);
                subMeshMaterialIndexesArray.forEach((el, index)=> {
                    if( index !== pickInfo.subMeshId && index !== (pickInfo.subMeshId+1)) {
                        setMaterial(el[0], index);
                    }
                });
            } else {
                console.log("on move");
                const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY)(engine, scene);
                const vertexDisplacementVector = getVertextDisplacementVector(currentDragVector, dragManager.getDragStartVector()!, dragManager.getDragNormalVector()!.scale(-1));
                simulator.simulate(cube, vertexDisplacementVector, dragManager.getDragFaceId()!)(scene);
            }
        } else {
            if(!dragManager.inDragState()) {
                subMeshMaterialIndexesArray.forEach((el, index)=> {
                    setMaterial(el[0], index);
                });
            } else {
                console.log("on move");
                const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY)(engine, scene);
                const vertexDisplacementVector = getVertextDisplacementVector(currentDragVector, dragManager.getDragStartVector()!, dragManager.getDragNormalVector()!);
                simulator.simulate(cube, vertexDisplacementVector, dragManager.getDragFaceId()!)(scene);
            }
        }
    }

    scene.onPointerDown = async function(event, pickInfo) {

        if(pickInfo.hit && pickInfo.pickedMesh === cube && !dragManager.inDragState()) {

            dragManager.setDragState(true, pickInfo.pickedPoint!, pickInfo.getNormal()!, pickInfo.faceId);
            cube.subMeshes[pickInfo.subMeshId].materialIndex = 7;

        } else if(pickInfo.hit && pickInfo.pickedMesh === cube && dragManager.inDragState()) {

            console.log("on down-1");
            const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY)(engine, scene);
            const vertexDisplacementVector = getVertextDisplacementVector(currentDragVector, dragManager.getDragStartVector()!, dragManager.getDragNormalVector()!.scale(-1));
            const v = getVertextDisplacementVector(currentDragVector, dragManager.getDragStartVector()!, dragManager.getDragNormalVector()!);
            console.log(vertexDisplacementVector, v, dragManager.getDragNormalVector(), dragManager.getDragNormalVector()?.scale(-1));

            extrudeMesh(cube, vertexDisplacementVector, dragManager.getDragFaceId()!);
            dragManager.setDragState(false);
            simulator.destroy();

        } else if(!pickInfo.hit && dragManager.inDragState()) {

            console.log("on down-2");
            const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY)(engine, scene);
            const vertexDisplacementVector = getVertextDisplacementVector(currentDragVector, dragManager.getDragStartVector()!, dragManager.getDragNormalVector()!);

            console.log(currentDragVector.asArray(), dragManager.getDragNormalVector());

            extrudeMesh(cube, vertexDisplacementVector, dragManager.getDragFaceId()!);
            dragManager.setDragState(false);
            simulator.destroy();
        }
    }
    
    //addLabelToMesh(cube);
}

function createScene(engine: Engine, canvas: HTMLCanvasElement) {

    let scene = new Scene(engine);

    let camera = new ArcRotateCamera("Camera", Math.PI/2, Math.PI/2, 2, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    let light = new HemisphericLight("light", new Vector3(1,0,0), scene);
    
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

