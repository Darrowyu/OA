import { Button } from "@/components/ui/button";
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/components/ui/empty";
import { Home, Compass } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFound() {
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
            <Empty>
                <EmptyHeader>
                    <EmptyTitle className="bg-gradient-to-b from-foreground via-foreground/80 to-transparent bg-clip-text font-extrabold text-9xl text-transparent">
                        404
                    </EmptyTitle>
                    <EmptyDescription className="-mt-8 text-nowrap text-foreground/80">
                        The page you're looking for might have been <br />
                        moved or doesn't exist.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex gap-2">
                        <Button asChild>
                            <Link to="/">
                                <Home className="mr-2 h-4 w-4" />
                                Go Home
                            </Link>
                        </Button>

                        <Button asChild variant="outline">
                            <Link to="/dashboard">
                                <Compass className="mr-2 h-4 w-4" />
                                Explore
                            </Link>
                        </Button>
                    </div>
                </EmptyContent>
            </Empty>
        </div>
    );
}
