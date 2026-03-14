import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Clock, DollarSign, Building2 } from 'lucide-react';

export default function InternshipCard({ internship, onApply, hasApplied }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          {internship.is_verified && (
            <Badge className="bg-green-100 text-green-800">Verified</Badge>
          )}
        </div>

        <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }} data-testid="internship-title">
          {internship.title}
        </h3>
        <p className="text-gray-600 font-medium mb-3">{internship.company}</p>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{internship.location}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{internship.duration_months} months</span>
          </div>
          {internship.stipend && (
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>₹{internship.stipend}/month</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {internship.skills_required.slice(0, 3).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
          ))}
        </div>

        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full mb-2" data-testid="view-details-btn">View Details</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{internship.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Company</h4>
                <p>{internship.company}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-gray-600">{internship.description}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {internship.skills_required.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Department</h4>
                  <p>{internship.department}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Location</h4>
                  <p>{internship.location}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Duration</h4>
                  <p>{internship.duration_months} months</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Stipend</h4>
                  <p>{internship.stipend ? `₹${internship.stipend}/month` : 'Unpaid'}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Application Deadline</h4>
                <p>{new Date(internship.application_deadline).toLocaleDateString()}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          onClick={() => onApply(internship.id)}
          disabled={hasApplied}
          className="w-full"
          data-testid="apply-internship-btn"
        >
          {hasApplied ? 'Already Applied' : 'Apply Now'}
        </Button>
      </CardContent>
    </Card>
  );
}