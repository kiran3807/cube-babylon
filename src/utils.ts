import { 
    Vector3, Matrix, Engine, Scene, Mesh, SubMesh, VertexBuffer, FloatArray
} from 'babylonjs';

// convert 2-d space coordinates of browser into projected 3d space coordinates 
// of the scene.
export function getPositionVectorFrom2D(clientX: number, clientY: number, engine: Engine, scene: Scene) {

    let screenPosition = new Vector3(clientX, clientY, 0.1);
    return Vector3.Unproject(
        screenPosition,
        engine.getRenderWidth(),
        engine.getRenderHeight(),
        Matrix.Identity(),
        scene.getViewMatrix(),
        scene.getProjectionMatrix()
    );
}

export function getVertextDisplacementVector(currentPointerVector: Vector3, startPointerVector: Vector3, faceNormalVector: Vector3) {

    const pointerDisplacementVector = currentPointerVector.subtract(startPointerVector);
    const displacementProjectionOnNormal = Vector3.Dot(pointerDisplacementVector, faceNormalVector) / faceNormalVector.length();
    const vertexDisplacementVector = faceNormalVector.scale(displacementProjectionOnNormal);
    
    //console.log("currentDragVector: ", currentPointerVector.asArray());
    //console.log("displacementProjectionOnNormal: ", displacementProjectionOnNormal);
    //console.log("vertexDisplacementVector: ", vertexDisplacementVector.asArray());

    return vertexDisplacementVector.scale(0.5);
}

/*export function extractVerticesFromSubMesh(mesh: Mesh, subMesh: SubMesh) {

    const meshPositions = mesh.getVerticesData(VertexBuffer.PositionKind);
    
    return meshPositions?.slice(subMesh.verticesStart, (subMesh.verticesStart + subMesh.verticesCount));
    
}*/