import { 
    Engine, MeshBuilder, ArcRotateCamera, HemisphericLight,
    Scene, Vector3, Color3, StandardMaterial, MultiMaterial, 
    SubMesh, 
} from 'babylonjs';
import { 
    buildDisplacementVector, extrudeMesh
} from "./utils";
import { 
    DragManager, ExtrusionSimulatorManager, HighlightManager,
    Cube
} from "./helper";

let canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
let engine = new Engine(canvas, true);


function createCube(scene: Scene) {

    let cube = new Cube(scene);

    // drag manager manages the state transitions pertaining to extrusions of faces by "dragging" them
    // around, simulator projects the coloured plane representing the possible position of the new face of 
    // cube after extrusion and the related state transitions. Highlighter takes care of 
    // the state transitions pertaining to highlighting of the faces of the cube
    const dragManager = new DragManager();
    const simulator = new ExtrusionSimulatorManager();
    const highlighter = new HighlightManager(cube);

    scene.onPointerMove = (event, pickInfo) => {
        
        if(pickInfo.hit && pickInfo.pickedMesh === cube.getMeshInstance()) {
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

        if(pickInfo.hit && pickInfo.pickedMesh === cube.getMeshInstance() && !dragManager.inDragState()) {

            dragManager.setDragState(true, pickInfo.pickedPoint!, pickInfo.getNormal(true, false)!, pickInfo.faceId);
            highlighter.highlightSelectedFace(pickInfo);

        } else if(pickInfo.hit && pickInfo.pickedMesh === cube.getMeshInstance() && dragManager.inDragState()) {

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

// basic initialisation and boiler plate
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

