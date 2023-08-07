import { 
    Mesh, Vector3, VertexBuffer, Scene, MeshBuilder, Color4, FloatArray, PickingInfo 
} from "babylonjs";


export class HighlightManager {
    
    subMeshMaterialIndexesArray: any[]
    cube: Mesh

    constructor(cube: Mesh) {

        this.subMeshMaterialIndexesArray = new Array<any>();
        this.cube = cube;

        this.cube.subMeshes.forEach((subMesh, index)=> {
            this.subMeshMaterialIndexesArray[index] = [subMesh.materialIndex, 6];
        });
    }

    private setMaterial(materialIndex: number, subMeshIndex: number) {
        this.cube.subMeshes[subMeshIndex].materialIndex = materialIndex;
    }
    
    highlightHoveredFace(pickInfo: PickingInfo) {

        this.setMaterial(this.subMeshMaterialIndexesArray[pickInfo.subMeshId][1], pickInfo.subMeshId);
        this.subMeshMaterialIndexesArray.forEach((el, index)=> {
            if( index !== pickInfo.subMeshId && index !== (pickInfo.subMeshId+1)) {
                this.setMaterial(el[0], index);
            }
        });
    }
    
    highlightSelectedFace(pickInfo: PickingInfo) {
        this.cube.subMeshes[pickInfo.subMeshId].materialIndex = 7;
    }

    removeHighlightsAllFaces() {

        this.subMeshMaterialIndexesArray.forEach((el, index)=> {
            this.setMaterial(el[0], index);
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

    simulate(cube: Mesh, displacementVector: Vector3, faceId: number) {
        if(this.instance) {
            this.instance.dispose();
        }

        const meshIndices = cube.getIndices();
        const meshPositions = cube.getVerticesData(VertexBuffer.PositionKind);
    
        const face = faceId / 2;
        const facet = 2 * Math.floor(face);
        
        let planePositions = new Array<number>();

        meshIndices!.slice(3 * facet, 3 * facet + 6).forEach((vertexIndex)=> {
            planePositions.push(meshPositions![3*vertexIndex] + displacementVector.x), 
            planePositions.push(meshPositions![3*vertexIndex + 1 ] + displacementVector.y), 
            planePositions.push(meshPositions![3*vertexIndex + 2 ] + displacementVector.z)
        });
    
        return (scene: Scene) => {

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
}

// a state managment helper class which neatly packages all the shared state variables and updates 
// them in tandem and in a controlled fashion.
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

    getDragNormalVector(): Vector3 | null {
        return this.dragNormalVector;
    }

    getDragFaceId(): number | null {
        return this.dragFaceId;
    }

    getDragStartVector() {
        return this.dragStartVector;
    }
}