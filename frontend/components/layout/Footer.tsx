import { Container } from '../ui/Container';

export const Footer = () => {
  return (
    <footer className="border-t py-10 mt-10">
      <Container>
        <div className="text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} StyleHub. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
};
