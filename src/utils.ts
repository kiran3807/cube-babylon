import { 
    Vector3, Matrix, Engine, Scene, Mesh, SubMesh, VertexBuffer, FloatArray, MeshBuilder,
    StandardMaterial, Color4
} from 'babylonjs';

// convert 2-d space coordinates of browser into projected 3d space coordinates 
// of the scene. We return a function that takes engine and scene as arguments
// in order to maintain separation of concerns viz these components have no bearing
// on the calculations done in the helper methods and vice versa, that is the concern
// pertaining to rendering graphics and displaying objects
export function getPositionVectorFrom2D(clientX: number, clientY: number) {

    const screenPosition = new Vector3(clientX, clientY, 0.1);

    return function(engine: Engine, scene: Scene) {
        return Vector3.Unproject(
            screenPosition,
            engine.getRenderWidth(),
            engine.getRenderHeight(),
            Matrix.Identity(),
            scene.getViewMatrix(),
            scene.getProjectionMatrix()
        );
    }
}

export function getVertextDisplacementVector(currentPointerVector: Vector3, startPointerVector: Vector3, faceNormalVector: Vector3) {

    
    let pointerDisplacementVector = currentPointerVector.subtract(startPointerVector);
    let displacementProjectionOnNormal = Vector3.Dot(pointerDisplacementVector, faceNormalVector) / faceNormalVector.length();
    displacementProjectionOnNormal = Math.sqrt(displacementProjectionOnNormal * displacementProjectionOnNormal);
    const vertexDisplacementVector = faceNormalVector.clone().normalize().scale(displacementProjectionOnNormal);

    // due to vector representing the translated 2-D coordinate mouse pointer taking up disproportinal values on account
    // of lack of proper scaling by the Vector3.Unproject method, we use hard-coded scaling.
    return vertexDisplacementVector;
}

export function extrudeMesh(mesh: Mesh, displacementVector: Vector3, faceId: number) {

    const meshIndices = mesh.getIndices();
    const meshPositions = mesh.getVerticesData(VertexBuffer.PositionKind);

    const face = faceId / 2;
    const facet = 2 * Math.floor(face);

    // some vertices are repeated in the indice array as facets are composed of 3 vertices each
    // and many vertices are common between different facets. Hence we use a set as it only stores 
    // unique elements
    new Set(meshIndices!.slice(3 * facet, 3 * facet + 6)).forEach((vertexIndex)=> {

        meshPositions![3*vertexIndex] = meshPositions![3*vertexIndex] + displacementVector.x;
        meshPositions![3*vertexIndex + 1 ] = meshPositions![3*vertexIndex + 1 ] + displacementVector.y;
        meshPositions![3*vertexIndex + 2] = meshPositions![3*vertexIndex + 2] + displacementVector.z;
    });

    mesh.updateVerticesData(VertexBuffer.PositionKind, meshPositions!, true);
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