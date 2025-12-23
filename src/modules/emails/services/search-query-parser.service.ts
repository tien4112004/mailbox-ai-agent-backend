import { Injectable } from '@nestjs/common';

export interface SearchCriteria {
  from?: string[];
  to?: string[];
  subject?: string[];
  contains?: string[];
  hasAttachment?: boolean;
  isRead?: boolean;
  isStarred?: boolean;
  folder?: string;
  generalSearch?: string; // Free text without criteria
}

@Injectable()
export class SearchQueryParser {
  /**
   * Parse advanced search query into structured criteria
   * Example: "from:john@example.com subject:meeting has:attachment"
   */
  parse(query: string): SearchCriteria {
    const criteria: SearchCriteria = {
      from: [],
      to: [],
      subject: [],
      contains: [],
    };

    // Extract criteria using regex
    const patterns = {
      from: /from:([^\s]+)/gi,
      to: /to:([^\s]+)/gi,
      subject: /subject:([^\s]+)/gi,
      contains: /contains:([^\s]+)/gi,
      has: /has:(\w+)/gi,
      is: /is:(\w+)/gi,
      folder: /folder:([^\s]+)/gi,
    };

    // Extract from: criteria
    let match;
    while ((match = patterns.from.exec(query)) !== null) {
      criteria.from.push(match[1]);
    }

    // Extract to: criteria
    while ((match = patterns.to.exec(query)) !== null) {
      criteria.to.push(match[1]);
    }

    // Extract subject: criteria
    while ((match = patterns.subject.exec(query)) !== null) {
      criteria.subject.push(match[1]);
    }

    // Extract contains: criteria
    while ((match = patterns.contains.exec(query)) !== null) {
      criteria.contains.push(match[1]);
    }

    // Extract has: criteria
    while ((match = patterns.has.exec(query)) !== null) {
      if (match[1].toLowerCase() === 'attachment') {
        criteria.hasAttachment = true;
      }
    }

    // Extract is: criteria
    while ((match = patterns.is.exec(query)) !== null) {
      const value = match[1].toLowerCase();
      if (value === 'read') {
        criteria.isRead = true;
      } else if (value === 'unread') {
        criteria.isRead = false;
      } else if (value === 'starred') {
        criteria.isStarred = true;
      }
    }

    // Extract folder: criteria
    while ((match = patterns.folder.exec(query)) !== null) {
      criteria.folder = match[1];
    }

    // Extract general search (text without criteria)
    let generalSearch = query;
    
    // Remove all criteria from the query
    generalSearch = generalSearch
      .replace(/from:[^\s]+/gi, '')
      .replace(/to:[^\s]+/gi, '')
      .replace(/subject:[^\s]+/gi, '')
      .replace(/contains:[^\s]+/gi, '')
      .replace(/has:\w+/gi, '')
      .replace(/is:\w+/gi, '')
      .replace(/folder:[^\s]+/gi, '')
      .trim();

    if (generalSearch) {
      criteria.generalSearch = generalSearch;
    }

    return criteria;
  }

  /**
   * Convert criteria back to query string (for display)
   */
  stringify(criteria: SearchCriteria): string {
    const parts: string[] = [];

    if (criteria.from?.length) {
      criteria.from.forEach(email => parts.push(`from:${email}`));
    }

    if (criteria.to?.length) {
      criteria.to.forEach(email => parts.push(`to:${email}`));
    }

    if (criteria.subject?.length) {
      criteria.subject.forEach(text => parts.push(`subject:${text}`));
    }

    if (criteria.contains?.length) {
      criteria.contains.forEach(text => parts.push(`contains:${text}`));
    }

    if (criteria.hasAttachment) {
      parts.push('has:attachment');
    }

    if (criteria.isRead === true) {
      parts.push('is:read');
    } else if (criteria.isRead === false) {
      parts.push('is:unread');
    }

    if (criteria.isStarred) {
      parts.push('is:starred');
    }

    if (criteria.folder) {
      parts.push(`folder:${criteria.folder}`);
    }

    if (criteria.generalSearch) {
      parts.push(criteria.generalSearch);
    }

    return parts.join(' ');
  }
}
