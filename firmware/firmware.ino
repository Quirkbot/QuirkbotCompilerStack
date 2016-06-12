// include the Quirkbot library to your program:
#include "Quirkbot.h"

// create your Quirkbot nodes here:
CircuitTouch horn;
Converter amplify1;
Converter amplify2;
Converter converter1;
Converter converter2;
Wave wave1;
Wave wave2;
DualColorLed leftArm;
DualColorLed leftLeg;
DualColorLed rightArm;
DualColorLed rightLeg;
Led led1;
Led leftMouth;
Led rightEye;
Led rightMouth;
ServoMotor servo1;
ServoMotor servo2;

// create your other Arduino variables and functions here:

void setup(){
	// setup your Quirkbot nodes here:
	horn.place = H;
	horn.sensitivity = 0;
	horn.min = 0;
	horn.max = 1;

	amplify1.in.connect(wave1.out);
	amplify1.inMin = 0.25;
	amplify1.inMax = 0.75;
	amplify1.outMin = 0;
	amplify1.outMax = 1;

	amplify2.in.connect(wave2.out);
	amplify2.inMin = 0.25;
	amplify2.inMax = 0.75;
	amplify2.outMin = 0;
	amplify2.outMax = 1;

	converter1.in.connect(horn.out);
	converter1.inMin = 0;
	converter1.inMax = 1;
	converter1.outMin = 0.8;
	converter1.outMax = 0.4;

	converter2.in.connect(horn.out);
	converter2.inMin = 0;
	converter2.inMax = 1;
	converter2.outMin = 0.4;
	converter2.outMax = 0.8;

	wave1.length.connect(converter1.out);
	wave1.type = WAVE_SINE;
	wave1.min = 0.25;
	wave1.max = 0.75;
	wave1.offset = 0;

	wave2.length.connect(converter2.out);
	wave2.type = WAVE_SINE;
	wave2.min = 0.25;
	wave2.max = 0.75;
	wave2.offset = 0;

	leftArm.color.connect(horn.out);
	leftArm.place = LA;
	leftArm.light = 1;

	leftLeg.light = 1;
	leftLeg.color.connect(horn.out);
	leftLeg.place = LL;

	rightArm.light = 1;
	rightArm.color.connect(horn.out);
	rightArm.place = RA;

	rightLeg.light = 1;
	rightLeg.color.connect(horn.out);
	rightLeg.place = RL;

	led1.light.connect(amplify1.out);
	led1.place = LE;

	leftMouth.light.connect(horn.out);
	leftMouth.place = LM;

	rightEye.light.connect(amplify2.out);
	rightEye.place = RE;

	rightMouth.light.connect(horn.out);
	rightMouth.place = RM;

	servo1.position.connect(wave1.out);
	servo1.place = SERVO_BP1;

	servo2.position.connect(wave2.out);
	servo2.place = SERVO_BP2;

	// put your other Arduino setup code here, to run once:

}

void loop(){
	// put your main Arduino code here, to run repeatedly:

}