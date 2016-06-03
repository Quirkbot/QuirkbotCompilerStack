switch (process.env.PROCESS_TYPE) {
	case 'web':
		require( './server.js' );
		break;
	case 'worker':
	default:
		require( './compiler.js' );
}
