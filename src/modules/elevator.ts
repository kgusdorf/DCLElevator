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

const elevatorSpeed = 2 // Lower is faster; adjust this depending on distance between floors; if you go too fast the player will clip through the room and fall out
const doorSlideOrigins = [[new Vector3(-1, 2, 1.95), new Vector3(-3, 2, 1.95)], [new Vector3(1, 2, 1.95), new Vector3(3, 2, 1.95)]] // Slide points for doors
const doors = [] // Holds door entities
const elevatorContainer: Entity = new Entity()
const ding: Entity = new Entity()

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
      } else {
        transform.position = Vector3.Lerp(lerp.origin, lerp.target, lerp.fraction)
        lerp.fraction += dt / (elevatorSpeed * lerp.floorDistance)
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
  floorArray: number[]

  constructor(pos: Vector3, floorArray: number[]){
    this.pos = pos
    this.floorArray = floorArray // Floor heights [Ground, 1st Floor, 2nd, 3rd, ...]

    engine.addSystem(new ElevatorMove())
    engine.addSystem(new DoorSystem())
    this.initializeEntities()
    toggleDoors(1) // Doors are opened when scene is loaded
  }

  // Sends elevator to floor passed as argument
  sendToFloor(x: number){
    let data = elevatorContainer.getComponent(ElevatorData)
    if (data.fraction == 1 && (x >= 0 && x < this.floorArray.length) && !data.inMovement && x != data.currFloor){
      data.inMovement = true
      toggleDoors(0)
      let pos = elevatorContainer.getComponent(ElevatorData).target
      data.floorDistance = Math.abs(x - data.currFloor)
      data.currFloor = x
      data.fraction = 0
      data.origin = data.target
      data.target = new Vector3(pos.x, this.floorArray[data.currFloor], pos.z)
    }
  }
  
  initializeEntities(){
    // Invisible entity that is parent of moving elevator pieces
    elevatorContainer.addComponent(new Transform({
      position: this.pos
    }))
    elevatorContainer.addComponent(new ElevatorData())
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
    for (let i = 0; i < this.floorArray.length; i++){
      const floorButton = new Entity()
      floorButton.setParent(elevatorContainer)
      floorButton.addComponent(new BoxShape())
      floorButton.addComponent(new Transform({
        position: new Vector3(1.9, 1.38+0.3*i, 1.35),
        scale: new Vector3(0.05, 0.2, 0.2)
      }))
      floorButton.addComponent(new Material())
      floorButton.getComponent(Material).albedoColor = Color3.Red()
      floorButton.addComponent(new OnClick( e => {
        this.sendToFloor(i)
      }))
      engine.addEntity(floorButton)

      const text = new Entity()
      text.setParent(elevatorContainer)
      text.addComponent(new Transform({
        position: new Vector3(1.87, 1.38+0.3*i, 1.35),
        rotation: Quaternion.Euler(0, 90, 0)
      }))
      const text1 = i > 0 ? new TextShape(String(i)) : new TextShape("G")
      text1.fontSize = 1.5
      text.addComponent(text1)
      engine.addEntity(text)
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
    for (let i = 0; i < this.floorArray.length; i++){
      let floor = new Entity()
      floor.addComponent(new BoxShape())
      floor.addComponent(new Transform({
        position: new Vector3(8, this.floorArray[i], 8),
        scale: new Vector3(16, 0.05, 16)
      }))
      floor.addComponent(new Material())
      floor.getComponent(Material).albedoColor = Color3.Gray()
      engine.addEntity(floor)
    }

    for (let i = 0; i < this.floorArray.length; i++){
      let button = new Entity()
      button.addComponent(new BoxShape())
      button.addComponent(new Transform({
        position: new Vector3(12, this.floorArray[i]+2, 0),
        scale: new Vector3(0.3, 0.3, 0.3)
      }))
      button.addComponent(new Material())
      button.getComponent(Material).albedoColor = Color3.Blue()
      button.addComponent(new OnClick( e => {
        this.sendToFloor(i)
      }))
      engine.addEntity(button)
    }
  }
}