import { 
    Vector3, Matrix, Engine, Scene, Mesh, VertexBuffer, IPointerEvent
} from 'babylonjs';

// convert 2-d space coordinates of browser into projected 3d space coordinates 
// of the scene. We return a function that takes engine and scene as arguments
// in order to maintain separation of concerns viz these components have no bearing
// on the calculations done in the helper methods and vice versa, that is the concern
// pertaining to rendering graphics and displaying objects
export function getPositionVectorFrom2D(clientX: number, clientY: number) {

    const screenPosition = new Vector3(clientX, clientY, 1);
    screenPosition.scaleInPlace(0.001);
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

export function getVertexDisplacementVector(currentPointerVector: Vector3, startPointerVector: Vector3, faceNormalVector: Vector3) {

    
    let pointerDisplacementVector = currentPointerVector.subtract(startPointerVector);
    let displacementProjectionOnNormal = Vector3.Dot(pointerDisplacementVector, faceNormalVector) / faceNormalVector.length();
    displacementProjectionOnNormal = Math.sqrt(displacementProjectionOnNormal * displacementProjectionOnNormal);
    const vertexDisplacementVector = faceNormalVector.clone().normalize().scale(displacementProjectionOnNormal);

    // due to vector representing the translated 2-D coordinate mouse pointer taking up disproportinal values on account
    // of lack of proper scaling by the Vector3.Unproject method, we use hard-coded scaling.
    return vertexDisplacementVector;
}

export function buildDisplacementVector(event: IPointerEvent, startVector: Vector3, normalVector: Vector3, engine: Engine, scene: Scene) {

    const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY)(engine, scene);
    return getVertexDisplacementVector(currentDragVector, startVector, normalVector);
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

