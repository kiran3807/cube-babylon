import { 
    Vector3, Matrix, Engine, Scene, Mesh, VertexBuffer, IPointerEvent,
    MeshBuilder
} from 'babylonjs';

import { Cube } from "./helper";

// convert 2-d space coordinates of browser into projected 3d space coordinates 
// of the scene.
export function getPositionVectorFrom2D(clientX: number, clientY: number, engine: Engine, scene: Scene) {

    const screenPosition = new Vector3(clientX, clientY, 0.9);
    return Vector3.Unproject(
        screenPosition,
        engine.getRenderWidth(),
        engine.getRenderHeight(),
        Matrix.Identity(),
        scene.getViewMatrix(),
        scene.getProjectionMatrix()
    );
}

// returns the vector along which the vertices will be translated during extrusion,
// the principle is to find the projection of the vector between point clicked on face
// and where the mouse is resting currently in the direction of the normal unit vector
// perpendicular to the mesh face
export function getVertexDisplacementVector(currentPointerVector: Vector3, startPointerVector: Vector3, faceNormalVector: Vector3) {

    
    let pointerDisplacementVector = currentPointerVector.subtract(startPointerVector);
    let displacementProjectionOnNormal = Vector3.Dot(pointerDisplacementVector, faceNormalVector) / faceNormalVector.length();
    const vertexDisplacementVector = faceNormalVector.clone().normalize().scale(displacementProjectionOnNormal);

    // due to vector representing the translated 2-D coordinate mouse pointer taking up disproportinal values on account
    // of lack of proper scaling by the Vector3.Unproject method, we use hard-coded scaling.
    return vertexDisplacementVector.scale(0.1);
}

export function buildDisplacementVector(event: IPointerEvent, startVector: Vector3, normalVector: Vector3, engine: Engine, scene: Scene) {

    const currentDragVector = getPositionVectorFrom2D(event.clientX, event.clientY, engine, scene);
    return getVertexDisplacementVector(currentDragVector, startVector, normalVector);
}

// extrusion is done via identifying the vertices present in the face of the mesh, in case of
// a cube it is done via the faceId param, which indicates the internal order of the faces
// within the cube, that internal order also corresponds to how the facets/vertices are organised
// the translation vector is added to all the points within the position array to successfully 
// extrude the cube face
export function extrudeMesh(cube: Cube, displacementVector: Vector3, faceId: number, scene: Scene) {

    const meshIndices = cube.getIndices();
    const meshPositions = cube.getPositionArray();

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

    cube.updatePositionArray(meshPositions!)
}

