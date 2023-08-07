import { 
    Engine, MeshBuilder, ArcRotateCamera, HemisphericLight,
    Scene, Vector3, Color3, StandardMaterial, MultiMaterial, 
    SubMesh, 
} from 'babylonjs';

import { 
    buildDisplacementVector, extrudeMesh
} from "./utils";
import { 
    DragManager,
    ExtrusionSimulatorManager,
    HighlightManager
} from "./helper";

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

    // drag manager manages the state transitions pertaining to extrusions of faces by "dragging" them
    // around
    // simulator projects the coloured plane representing the possible position of the new face of cube after
    // extrusion and the related state transitions.
    // highlighter takes care of the state transitions pertaining to highlighting of the faces of the cube
    const dragManager = new DragManager();
    const simulator = new ExtrusionSimulatorManager();
    const highlighter = new HighlightManager(cube);

    scene.onPointerMove = (event, pickInfo) => {
        
        if(pickInfo.hit && pickInfo.pickedMesh === cube) {
            if(!dragManager.inDragState()) {

                highlighter.highlightHoveredFace(pickInfo);
            } else {

                const vertexDisplacementVector = buildDisplacementVector(
                    event, 
                    dragManager.getStartVector()!, 
                    dragManager.getNormalVector()!, 
                    engine, 
                    scene
                );
                simulator.simulate(cube, vertexDisplacementVector, dragManager.getFaceId()!, scene);
            }
        } else {
            if(!dragManager.inDragState()) {

                highlighter.removeHighlightsAllFaces();
            } else {

                const vertexDisplacementVector = buildDisplacementVector(
                    event, 
                    dragManager.getStartVector()!, 
                    dragManager.getNormalVector()!, 
                    engine, 
                    scene
                );
                simulator.simulate(cube, vertexDisplacementVector, dragManager.getFaceId()!, scene);
            }
        }
    }

    scene.onPointerDown = async function(event, pickInfo) {

        if(pickInfo.hit && pickInfo.pickedMesh === cube && !dragManager.inDragState()) {

            dragManager.setDragState(true, pickInfo.pickedPoint!, pickInfo.getNormal(true, false)!, pickInfo.faceId);
            highlighter.highlightSelectedFace(pickInfo);

        } else if(pickInfo.hit && pickInfo.pickedMesh === cube && dragManager.inDragState()) {

            const vertexDisplacementVector = buildDisplacementVector(
                event, 
                dragManager.getStartVector()!, 
                dragManager.getNormalVector()!, 
                engine, 
                scene
            );

            extrudeMesh(cube, vertexDisplacementVector, dragManager.getFaceId()!, scene);
            dragManager.setDragState(false);
            simulator.destroy();

        } else if(!pickInfo.hit && dragManager.inDragState()) {

            const vertexDisplacementVector = buildDisplacementVector(
                event, 
                dragManager.getStartVector()!, 
                dragManager.getNormalVector()!, 
                engine, 
                scene
            );

            extrudeMesh(cube, vertexDisplacementVector, dragManager.getFaceId()!, scene);
            dragManager.setDragState(false);
            simulator.destroy();
        }
    }
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

