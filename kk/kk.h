#ifndef _KK_H
#define _KK_H

#include <string>

namespace kk {

    typedef double Number;
    typedef bool Boolean;
    typedef void * IMP;
    class Closure;
    class IObject;

    class String : public std::string {
    public:
        String();
        String(const char * v);
        String(const String& v);
        String& operator=(const char * v);
        String& operator=(Boolean v);
        String& operator=(Number v);
        String& operator=(IObject * v);
    };

    class IObject {
    public:
    };

    class Object : public IObject {
    public:
        virtual operator kk::IMP();
    };

    class Function : public Object {
    public:
        Function();
        Function(IMP imp,Closure * closure);
        Function& operator=(IObject * v);
    };

    template<typename TKey,typename TValue>
    class Map : public Object {
    public:
        TValue operator [] (TKey key,TValue value) {
            _objects[key] = value;
            return * this;
        }
        TValue operator [] (TKey key) {
            return _objects[key];
        }
    protected:
        std::map<TKey,TValue> _objects;
    };

    class Closure : public Object {
    public:
        virtual Closure * parent();
        virtual void addObject(IObject * object);
    };

    void Retain(IObject * object);

    void Release(IObject * object);

    class Strong {
    public:
        Strong();
        Strong(IObject * object);
        Strong(const Strong &ref);
        virtual ~Strong();
        virtual IObject * get();
        virtual void set(IObject * object);
        Strong& operator=(IObject * object);
        Strong& operator=(Strong& ref);
    };

    enum Type {
        TypeNil,
        TypeString,
        TypeNumber,
        TypeBoolean,
        TypeFunction,
        TypeObject
    };

    class Any {
    public:
        Any();
        Any(IObject * object);
        Any(kk::String &v);
        Any(Any & v);
        virtual String & stringValue();
        virtual Object * objectValue();
        virtual Function * functionValue();
        virtual Number numberValue();
        virtual Boolean booleanValue();
        
        virtual bool operator!=(IObject * b);
        virtual bool operator==(IObject * b);

        virtual operator kk::IMP();
        virtual operator kk::String();

    protected:
        Type _type;
        Strong _objectValue;
        String _stringValue;
        union {
            Number _numberValue;
            Boolean _booleanValue;
        };
    };

}

#endif

