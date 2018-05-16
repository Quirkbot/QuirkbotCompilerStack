#include "Quirkbot.h"

CircuitTouch horn;
Converter amplify1;
Converter amplify2;
Converter converter1;
Converter converter2;
Wave wave1;
Wave wave2;
Led leftEye;
Led rightEye;
ServoMotor servo1;
ServoMotor servo2;

void setup() {
	horn.place = H;

	amplify1.in.connect(wave1.out);
	amplify1.inMin = 0.25;
	amplify1.inMax = 0.75;

	amplify2.in.connect(wave2.out);
	amplify2.inMin = 0.25;
	amplify2.inMax = 0.75;

	converter1.in.connect(horn.out);
	converter1.outMin = 0.8;
	converter1.outMax = 0.4;

	converter2.in.connect(horn.out);
	converter2.outMin = 0.4;
	converter2.outMax = 0.8;

	wave1.length.connect(converter1.out);
	wave1.min = 0.25;
	wave1.max = 0.75;

	wave2.length.connect(converter2.out);
	wave2.min = 0.25;
	wave2.max = 0.75;

	leftEye.light.connect(amplify1.out);
	leftEye.place = LE;

	rightEye.light.connect(amplify2.out);
	rightEye.place = RE;

	servo1.position.connect(wave1.out);
	servo1.place = SERVO_BP1;

	servo2.position.connect(wave2.out);
	servo2.place = SERVO_BP2;

	pinMode(LAF, OUTPUT);
	pinMode(LAB, OUTPUT);
	pinMode(RAF, OUTPUT);
	pinMode(RAB, OUTPUT);
	pinMode(LLF, OUTPUT);
	pinMode(LLB, OUTPUT);
	pinMode(RLF, OUTPUT);
	pinMode(RLB, OUTPUT);
}
void loop(){
	if(horn.out.get() > 0.5){
		PORTD |= (1<<5);
		PORTB |= (1<<0);

		digitalWrite(LAF, LOW);
		digitalWrite(LAB, HIGH);

		digitalWrite(RAF, LOW);
		digitalWrite(RAB, HIGH);

		digitalWrite(LLF, LOW);
		digitalWrite(LLB, HIGH);

		digitalWrite(RLF, LOW);
		digitalWrite(RLB, HIGH);
	}
	else{
		PORTD &= ~(1<<5);
		PORTB &= ~(1<<0);

		digitalWrite(LAF, HIGH);
		digitalWrite(LAB, LOW);

		digitalWrite(RAF, HIGH);
		digitalWrite(RAB, LOW);

		digitalWrite(LLF, HIGH);
		digitalWrite(LLB, LOW);

		digitalWrite(RLF, HIGH);
		digitalWrite(RLB, LOW);
	}
}
