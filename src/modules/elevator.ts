// Custom component used to store elevator info
@Component("ElevatorData")
export class ElevatorData {
  origin: Vector3 = new Vector3(8, 0, -2)
  target: Vector3 = new Vector3(8, 0, -2)
  fraction: number = 1
  currFloor: number = 0
  inMovement: boolean = false
  floorDistance: number = 0
}

// Custom component used to store sliding door info
@Component("DoorData")
export class DoorData {
  origin: Vector3 = Vector3.Zero()
  target: Vector3 = Vector3.Zero()
  fraction: number = 1
  isDoorOpen: boolean = false
}

// Flag for buttons in elevator
@Component("ElevatorButton")
export class ElevatorButton {}

const elevatorSpeed = 2 // Lower is faster; adjust this depending on distance between floors; if you go too fast the player will clip through the room and fall out
const doorSlideOrigins = [[new Vector3(-1, 2, 1.95), new Vector3(-3, 2, 1.95)], [new Vector3(1, 2, 1.95), new Vector3(3, 2, 1.95)]] // Slide points for doors
const doors = [] // Holds door entities
const elevatorContainer: Entity = new Entity()
const ding: Entity = new Entity()
let floorArray: number[]
const floorScreenContainerArray = []
const floorScreenTextArray = []

// Toggles sliding doors; Passing 0 will close; Passing 1 will open
function toggleDoors(x: number){
  for (let i = 0; i < 2; i++){
    if (doors[i].getComponent(DoorData).fraction == 1 && doors[i].getComponent(DoorData).isDoorOpen != x){
      doors[i].getComponent(DoorData).isDoorOpen = x
      doors[i].getComponent(DoorData).fraction = 0
      doors[i].getComponent(DoorData).origin = doorSlideOrigins[i][Math.abs(x-1)]
      doors[i].getComponent(DoorData).target = doorSlideOrigins[i][x]
    }
  }
}

// System used to slide elevator
export class ElevatorMove {
  update(dt: number) {
    let transform = elevatorContainer.getComponent(Transform)
    let lerp = elevatorContainer.getComponent(ElevatorData)
    if (lerp.fraction < 1 && !doors[0].getComponent(DoorData).isDoorOpen && doors[0].getComponent(DoorData).fraction == 1) {
      if ((lerp.fraction + dt / (elevatorSpeed * lerp.floorDistance)) > 1){
        lerp.fraction = 1
        transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
        ding.getComponent(AudioSource).playOnce()
        toggleDoors(1)
        for (let entity of engine.getComponentGroup(ElevatorButton).entities){
          entity.getComponent(Material).albedoColor = Color3.Gray()
        }
        for (let i = 0; i < floorScreenContainerArray.length; i++){
          if (i % 3 == 0) {
            floorScreenContainerArray[i].getComponent(GLTFShape).visible = 1
          } else if ((i % 3 == 1) || (i % 3 == 2)) {
            floorScreenContainerArray[i].getComponent(GLTFShape).visible = 0
          }
        }
      } else {
        transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
        lerp.fraction += dt / (elevatorSpeed * lerp.floorDistance)
      }
    }
    let yPos = Math.floor(transform.position.y)
    if (floorArray.includes(yPos)){
      for (let screenText of floorScreenTextArray){
        screenText.getComponent(TextShape).value = yPos != 0 ? floorArray.indexOf(yPos) : "G"
      }
    }
  }
}

// System used to slide doors open / closed
export class DoorSystem {
  update(dt: number) {
    for (let entity of doors){
      let transform = entity.getComponent(Transform)
      let lerp = entity.getComponent(DoorData)
      if (lerp.fraction < 1) {
        if ((lerp.fraction + dt / 3) > 1){
          lerp.fraction = 1
          transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
          if (lerp.isDoorOpen){
            elevatorContainer.getComponent(ElevatorData).inMovement = false
          }
        } else {
          transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
          lerp.fraction += dt / 3
        }
      }
    }
  }
}

export class Elevator {
  pos: Vector3
  rot: Quaternion = Quaternion.Euler(0, 0, 0)

  constructor(pos: Vector3, fArray: number[], rot?: Quaternion){
    this.pos = pos
    this.rot = rot
    floorArray = fArray // Floor heights [Ground, 1st Floor, 2nd, 3rd, ...]

    engine.addSystem(new ElevatorMove(), 1)
    engine.addSystem(new DoorSystem(), 2)
    this.initializeEntities()
    toggleDoors(1) // Doors are opened when scene is loaded
  }

  // Sends elevator to floor passed as argument
  sendToFloor(x: number){
    let data = elevatorContainer.getComponent(ElevatorData)
    if (data.fraction == 1 && (x >= 0 && x < floorArray.length) && !data.inMovement && x != data.currFloor){
      for (let i = 0; i < floorScreenContainerArray.length; i++){
        if ((i % 3 == 1) && ((x - data.currFloor) > 0)){
          floorScreenContainerArray[i].getComponent(GLTFShape).visible = 1
        } else if ((i % 3 == 2) && ((x - data.currFloor) < 0)) {
          floorScreenContainerArray[i].getComponent(GLTFShape).visible = 1
        } else {
          floorScreenContainerArray[i].getComponent(GLTFShape).visible = 0
        }
      }
      data.inMovement = true
      engine.getComponentGroup(ElevatorButton).entities[x].getComponent(Material).albedoColor = Color3.Green()
      toggleDoors(0)
      let pos = elevatorContainer.getComponent(ElevatorData).target
      data.floorDistance = Math.abs(x - data.currFloor)
      data.currFloor = x
      data.fraction = 0
      data.origin = data.target
      data.target = new Vector3(pos.x, floorArray[data.currFloor], pos.z)
    }
  }
  
  initializeEntities(){
    // Invisible entity that is parent of moving elevator pieces
    elevatorContainer.addComponent(new Transform({
      position: this.pos,
      rotation: this.rot
    }))
    elevatorContainer.addComponent(new ElevatorData())
    elevatorContainer.getComponent(ElevatorData).origin = this.pos
    elevatorContainer.getComponent(ElevatorData).target = this.pos
    engine.addEntity(elevatorContainer)

    // Ding sound effect
    ding.setParent(elevatorContainer)
    ding.addComponent(new AudioSource(new AudioClip("sounds/ding.mp3")))
    engine.addEntity(ding)

    // Room that goes up and down
    const elevatorRoom = new Entity()
    elevatorRoom.addComponent(new GLTFShape("models/elevator.glb"))
    elevatorRoom.setParent(elevatorContainer)
    elevatorRoom.addComponent(new Transform({
      position: new Vector3(0, 0, 0.47),
      scale: new Vector3(0.5, 0.5, 0.5)
    }))
    engine.addEntity(elevatorRoom)

    // Buttons inside elevator to select floor
    for (let i = 0; i < floorArray.length; i++){
      const floorButton = new Entity()
      floorButton.setParent(elevatorContainer)
      floorButton.addComponent(new ElevatorButton())
      floorButton.addComponent(new CylinderShape())
      floorButton.addComponent(new Transform({
        position: new Vector3(1.9, 1.38+0.3*i, 1.35),
        scale: new Vector3(0.1, 0.05, 0.1),
        rotation: Quaternion.Euler(0, 0, -90)
      }))
      floorButton.addComponent(new Material())
      floorButton.getComponent(Material).albedoColor = Color3.Gray()
      floorButton.addComponent(new OnClick( e => {
        this.sendToFloor(i)
      }))
      engine.addEntity(floorButton)

      const buttonText = new Entity()
      buttonText.setParent(elevatorContainer)
      buttonText.addComponent(new Transform({
        position: new Vector3(1.84, 1.38+0.3*i, 1.35),
        rotation: Quaternion.Euler(0, 90, 0)
      }))
      const text1 = i > 0 ? new TextShape(String(i)) : new TextShape("G")
      text1.fontSize = 1.5
      text1.color = Color3.White()
      buttonText.addComponent(text1)
      engine.addEntity(buttonText)
    }

    // Sliding doors
    for (let i = 0; i < 2; i++){
      doors[i] = new Entity()
      doors[i].setParent(elevatorContainer)
      doors[i].addComponent(new BoxShape())
      doors[i].addComponent(new DoorData())
      doors[i].addComponent(new Transform({
        position: doorSlideOrigins[i][0],
        scale: new Vector3(2, 4, 0.05)
      }))
      doors[i].addComponent(new Material())
      doors[i].getComponent(Material).albedoColor = Color3.Black()
      engine.addEntity(doors[i])
    }

    // Floor entities for each level
    for (let i = 0; i < floorArray.length; i++){
      let floor = new Entity()
      floor.addComponent(new BoxShape())
      floor.addComponent(new Transform({
        position: new Vector3(8, floorArray[i], 8),
        scale: new Vector3(16, 0.05, 16)
      }))
      floor.addComponent(new Material())
      floor.getComponent(Material).albedoColor = Color3.Gray()
      engine.addEntity(floor)
    }

    for (let i = 0; i < floorArray.length; i++){
      let button = new Entity()
      button.addComponent(new BoxShape())
      button.addComponent(new Transform({
        position: new Vector3(12, floorArray[i]+2, 0),
        scale: new Vector3(0.3, 0.3, 0.3)
      }))
      button.addComponent(new Material())
      button.getComponent(Material).albedoColor = Color3.Blue()
      button.addComponent(new OnClick( e => {
        this.sendToFloor(i)
      }))
      engine.addEntity(button)

      for (let j = 0; j < 3; j++){
        let floorScreen = new Entity()
        floorScreen.addComponent(new Transform({
          position: new Vector3(12, floorArray[i]+3, 0),
          rotation: Quaternion.Euler(0, 90, 0)
        }))
        if (j == 0){
          floorScreen.addComponent(new GLTFShape("models/defaultScreen.glb"))
        } else if (j == 1){
          floorScreen.addComponent(new GLTFShape("models/upScreen.glb"))
          floorScreen.getComponent(GLTFShape).visible = false
        } else {
          floorScreen.addComponent(new GLTFShape("models/downScreen.glb"))
          floorScreen.getComponent(GLTFShape).visible = false
        }
        floorScreenContainerArray.push(floorScreen)
        engine.addEntity(floorScreen)

        let screenText = new Entity()
        screenText.addComponent(new Transform({
          position: new Vector3(12, floorArray[i]+3, 0.04),
          rotation: Quaternion.Euler(0, 180, 0)
        }))
        const floorScreenText = new TextShape("G")
        floorScreenText.fontSize = 2
        screenText.addComponent(floorScreenText)
        floorScreenTextArray.push(screenText)
        engine.addEntity(screenText)
      }
    }

    for (let i = 0; i < 3; i++){
      let floorScreen = new Entity()
      floorScreen.setParent(elevatorContainer)
      floorScreen.addComponent(new Transform({
        position: new Vector3(1.9, 2.7, 1.35),
        scale: new Vector3(0.7, 0.7, 0.7)
      }))
      if (i == 0){
        floorScreen.addComponent(new GLTFShape("models/defaultScreen.glb"))
      } else if (i == 1){
        floorScreen.addComponent(new GLTFShape("models/upScreen.glb"))
        floorScreen.getComponent(GLTFShape).visible = false
      } else {
        floorScreen.addComponent(new GLTFShape("models/downScreen.glb"))
        floorScreen.getComponent(GLTFShape).visible = false
      }
      floorScreenContainerArray.push(floorScreen)
      engine.addEntity(floorScreen)
    }

    let screenText = new Entity()
    screenText.setParent(elevatorContainer)
    screenText.addComponent(new Transform({
      position: new Vector3(1.86, 2.7, 1.35),
      rotation: Quaternion.Euler(0, 90, 0)
    }))
    const floorScreenText = new TextShape("G")
    floorScreenText.fontSize = 1
    screenText.addComponent(floorScreenText)
    floorScreenTextArray.push(screenText)
    engine.addEntity(screenText)
  }
}