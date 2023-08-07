import { 
    Mesh, Vector3, VertexBuffer, Scene, MeshBuilder, Color4, FloatArray, PickingInfo,
    StandardMaterial, MultiMaterial, Color3, SubMesh, Nullable
} from "babylonjs";


// Cube class hides within it the direct interaction with babylonjs APIs and presents
// a highly application specific interface for usage among other components of the demo.
// thus achieving a rudimentary level of seperation of concerns and dependency inversion
// viz, isolating the low level details of interactions with meshes, which allows for better
// expression of demo specific logic and encapsulation of logic specific to cube interaction
// at one manageble place.
export class Cube {

    private cube: Mesh

    constructor(scene: Scene) {
        
        this.cube = MeshBuilder.CreateBox("cube", {size: 1, updatable : true}, scene);

        this.cube.enablePointerMoveEvents = true;
        this.cube.forceSharedVertices();

        let cubeMaterials = new MultiMaterial("cubeMaterials", scene);
        let verticesCount = this.cube.getTotalVertices();
        this.cube.subMeshes = [];

        for(let i=0; i<6; i++) {
            let subMaterial = new StandardMaterial(`material-${i}`);
            subMaterial.diffuseColor = new Color3(1,0,0.75);
            subMaterial.alpha = 0.4;
            cubeMaterials.subMaterials.push(subMaterial);
            this.cube.subMeshes.push(new SubMesh(i, i, verticesCount, (0 + i*6), 6, this.cube));
        }
        this.cube.material = cubeMaterials;

        let materialHighlight = new StandardMaterial("material-highlight");
        materialHighlight.diffuseColor = new Color3(0.25,0.75,0.35);
        materialHighlight.alpha = 0.4;
        cubeMaterials.subMaterials.push(materialHighlight);

        let materialExtrusionHighlight = new StandardMaterial("material-extrusion-highlight");
        materialHighlight.diffuseColor = new Color3(0.3,0.8,0.4);
        materialExtrusionHighlight.alpha = 0.4;
        cubeMaterials.subMaterials.push(materialExtrusionHighlight);
    }

    setSubMaterial(materialIndex: number, subMeshIndex: number) {
        this.cube.subMeshes[subMeshIndex].materialIndex = materialIndex;
    }

    highlightSelectedFace(pickInfo: PickingInfo) {
        this.cube.subMeshes[pickInfo.subMeshId].materialIndex = 7;
    }

    populateSubMeshMaterialIndexesArray() {

        let indexesArray = new Array<any>();

        this.cube.subMeshes.forEach((subMesh, index)=> {
            indexesArray[index] = [subMesh.materialIndex, 6];
        });

        return indexesArray;
    }

    getMeshInstance() {
        return this.cube
    }

    getIndices() {
        return this.cube.getIndices();
    }

    getPositionArray() {
        return this.cube.getVerticesData(VertexBuffer.PositionKind);
    }

    updatePositionArray(positions: Nullable<FloatArray>) {
        if(positions) {
            this.cube.updateVerticesData(VertexBuffer.PositionKind, positions, true);
        }
    }
}

// HighLightManagement, ExtrusionSimulatorManager and DragManager are state management helper classes which 
// neatly packages all the shared state variables and updates them in tandem and in a controlled fashion.
export class HighlightManager {
    
    subMeshMaterialIndexesArray: any[]

    constructor(private cube: Cube) {
        this.subMeshMaterialIndexesArray = cube.populateSubMeshMaterialIndexesArray();
    }

    
    highlightHoveredFace(pickInfo: PickingInfo) {

        this.cube.setSubMaterial(this.subMeshMaterialIndexesArray[pickInfo.subMeshId][1], pickInfo.subMeshId);
        this.subMeshMaterialIndexesArray.forEach((el, index)=> {
            if( index !== pickInfo.subMeshId && index !== (pickInfo.subMeshId+1)) {
                this.cube.setSubMaterial(el[0], index);
            }
        });
    }

    highlightSelectedFace(pickInfo: PickingInfo) {
        this.cube.highlightSelectedFace(pickInfo);
    }

    removeHighlightsAllFaces() {

        this.subMeshMaterialIndexesArray.forEach((el, index)=> {
            this.cube.setSubMaterial(el[0], index);
        });
    }
}

export class ExtrusionSimulatorManager {
    
    private instance : Mesh | null = null

    destroy() {
        if(this.instance) {
            this.instance.dispose();
        }
        this.instance = null;
    }

    simulate(cube: Cube, displacementVector: Vector3, faceId: number, scene: Scene) {
        if(this.instance) {
            this.instance.dispose();
        }

        const meshIndices = cube.getIndices();
        const meshPositions = cube.getPositionArray();
    
        const face = faceId / 2;
        const facet = 2 * Math.floor(face);
        
        let planePositions = new Array<number>();

        meshIndices!.slice(3 * facet, 3 * facet + 6).forEach((vertexIndex)=> {
            planePositions.push(meshPositions![3*vertexIndex] + displacementVector.x), 
            planePositions.push(meshPositions![3*vertexIndex + 1 ] + displacementVector.y), 
            planePositions.push(meshPositions![3*vertexIndex + 2 ] + displacementVector.z)
        });

        this.instance = MeshBuilder.CreatePlane("simulation", {}, scene);
        this.instance.setIndices([0, 1, 2, 3, 4, 5]);
        this.instance.setVerticesData(
            VertexBuffer.PositionKind,
            planePositions
        );

        this.instance.setVerticesData(
            VertexBuffer.ColorKind,
            Array.from({ length: 6 }).fill(
                new Color4(12 / 255, 242 / 255, 93 / 255, 1).asArray()
            ).flat() as FloatArray
        );
        this.instance.updateFacetData();
        this.instance.convertToFlatShadedMesh();
    }
}

export class DragManager {

    private dragStartVector: Vector3 | null = null
    private dragNormalVector: Vector3 | null = null
    private dragFaceId: number | null = null
    private state = false;

    inDragState(): boolean {
        return this.state;
    }

    setDragState(state: boolean, dragStartVector?: Vector3, dragNormalVector?: Vector3, dragFaceId? : number): void {
        
        if(state) {

            if(dragStartVector !== undefined && dragNormalVector !==undefined &&  dragFaceId !== undefined) {
                this.dragStartVector = dragStartVector;
                this.dragNormalVector = dragNormalVector;
                this.dragFaceId = dragFaceId;
            } else {
                throw Error("cannot set rest of the elements without setting drag state as true");
            }
        } else {
            this.dragStartVector = null;
            this.dragNormalVector = null;
            this.dragFaceId = null;
        }
        
        this.state = state;
    }

    getNormalVector(): Vector3 | null {
        return this.dragNormalVector;
    }

    getFaceId(): number | null {
        return this.dragFaceId;
    }

    getStartVector() {
        return this.dragStartVector;
    }
}