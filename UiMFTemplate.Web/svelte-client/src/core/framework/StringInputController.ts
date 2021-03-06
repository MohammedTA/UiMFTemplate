import * as umf from "uimf-core";
import { InputController } from "./InputController";

export class StringInputController extends InputController<string> {
	constructor(metadata: umf.InputFieldMetadata) {
		super(metadata);
	}

	public serializeValue(value: string): string {
		// Ensure we don't return "undefined", but return null instead.
		return value != null ? value.toString() : null;
	}

	public init(value: string): Promise<StringInputController> {
		this.value = value;
		return Promise.resolve(this);
	}

	public getValue(): Promise<string> {
		return Promise.resolve(this.value);
	}
}
