import { expect } from 'chai';

import { wrap, WrappedError } from '../../src/lib/utils/error';

describe('# Utils error tests', () => {
    describe('wrap()', () => {
        it('Should add the header to the beggining of wrapped error message', () => {
            const header = 'x';
            const wrappedError = wrap(header, new Error('y'));

            expect(wrappedError.message.split(':')[0]).to.equal(header);
        });

        it('Should add a header property to WrappedError', () => {
            const header = 'x';
            const wrappedError = wrap(header, new Error('y'));

            expect(wrappedError.header).to.equal(header);
        });

        it('Should keep original stack trace', () => {
            const header = 'x';
            const originalError = new Error('y');
            originalError.stack = 'stackTrace';

            const wrappedError = wrap(header, originalError);

            expect(wrappedError.stack).to.equal(originalError.stack);
        });

        it('Should keep original error name', () => {
            const header = 'x';
            const originalError = new Error('y');
            originalError.name = 'ErrorName';

            const wrappedError = wrap(header, originalError);

            expect(wrappedError.name).to.equal(originalError.name);
        });

        it('Should return an Error', () => {
            const header = 'x';
            const wrappedError = wrap(header, new Error('y'));

            expect(wrappedError).to.be.instanceOf(Error);
        });
    });
});
