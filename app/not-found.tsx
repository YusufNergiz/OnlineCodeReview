import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileX, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
            <FileX className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl">Code Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            The code snippet you're looking for doesn't exist or may have been
            removed.
          </p>
          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Create New Code Review
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
